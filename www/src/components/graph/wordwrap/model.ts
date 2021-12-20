/**
 * An object (eg. a word) to be typeset.
 */
export interface Box {
  type: "box";

  text: string;

  /** Amount of space required by this content. Must be >= 0. */
  width: number;
}

/**
 * A space between `Box` items with a preferred width and some
 * capacity to stretch or shrink.
 *
 * `Glue` items are also candidates for breakpoints if they immediately follow a
 * `Box`.
 */
export interface Glue {
  type: "glue";
  text: string;

  /**
   * Preferred width of this space. Must be >= 0.
   */
  width: number;
  /** Maximum amount by which this space can grow. */
  stretch: number;
  /** Maximum amount by which this space can shrink. */
  shrink: number;
}

/**
 * An explicit candidate position for breaking a line.
 */
export interface Penalty {
  type: "penalty";
  text: string;

  /**
   * Amount of space required for typeset content to be added (eg. a hyphen) if
   * a line is broken here. Must be >= 0.
   */
  width: number;
  /**
   * The undesirability of breaking the line at this point.
   *
   * Values <= `MIN_COST` and >= `MAX_COST` mandate or prevent breakpoints
   * respectively.
   */
  cost: number;
  /**
   * A hint used to prevent successive lines being broken with hyphens. The
   * layout algorithm will try to avoid successive lines being broken at flagged
   * `Penalty` items.
   */
  flagged: boolean;
}

export type ParagraphUnit = Box | Glue | Penalty;
export type ParagraphRenderedUnit = ParagraphUnit & {
  x: number;
  y: number;
  lineNumber: number;
  renderedWidth: number;
};
export type ParagraphLine = ParagraphUnit[];

export interface RenderParams {
  lineHeight: number;
  cssLineHeight: number;
  fontSize: number;
  align: "center" | "left" | "justify" | "right";
  verticalAlign: "middle";
  // shorten the line's length if possible -- this will affect "justify" paragraph
  // for non uniform line length, this does not change the length of line less than the new maximum length
  // hence may produce ugly result
  autoLength: boolean;
}

export class Paragraph {
  public readonly spaceWidth: number;
  public readonly units: ParagraphUnit[];
  public readonly lineLengths: number | number[];
  public readonly getLineLength: (i: number) => number;

  constructor(units: ParagraphUnit[], lineLengths: number | number[]) {
    this.units = units;
    this.lineLengths = lineLengths;

    if (Array.isArray(lineLengths)) {
      this.getLineLength = (i: number) =>
        i < lineLengths.length
          ? lineLengths[i]
          : lineLengths[lineLengths.length - 1];
    } else {
      this.getLineLength = (i: number) => lineLengths;
    }

    this.spaceWidth = 0;
    for (const unit of units) {
      if (unit.type === "glue") {
        this.spaceWidth = unit.width;
        break;
      }
    }
  }

  /**
   * A convenience function that generates a set of input items for `breakLines`
   * from a string.
   *
   * @param text - Text to process
   * @param measureFn - Callback that calculates the width of a given string
   * @param hyphenateFn - Callback that calculates legal hyphenation points in
   *                      words and returns an array of pieces that can be joined
   *                      with hyphens.
   */
  static getUnitsFromText(
    text: string,
    measureFn: (word: string) => number,
    hyphenateFn?: (word: string) => string[],
    separable?: string[],
    penaltyCost: number = 1000
  ): ParagraphUnit[] {
    const units: ParagraphUnit[] = [];
    // MODIFY: modify here to split the word further to create possible break points of really long equation/json string
    let chunks = text.split(/(\s+)/).filter((w) => w.length > 0);
    if (separable !== undefined && separable.length > 0) {
      const re = new RegExp(`.*?[${separable.join("")}]|.+`, "g");
      chunks = chunks.flatMap((w) => w.match(re)!);
    }

    // Here we assume that every space has the same default size. Callers who want
    // more flexibility can use the lower-level functions.
    const spaceWidth = measureFn(" ");
    const hyphenWidth = measureFn("-");
    const isSpace = (word: string) => /\s/.test(word.charAt(0));

    // MODIFY: from Knuth-Place paper (space 1/3em, stretch 1/6em, shrink 1/9em)
    const stretch = spaceWidth / 2;
    const shrink = spaceWidth / 3;

    chunks.forEach((w) => {
      if (isSpace(w)) {
        const g: Glue = {
          type: "glue",
          width: spaceWidth,
          shrink,
          stretch,
          text: w,
        };
        units.push(g);
        return;
      }

      // MODIFY: for words that are splitted in the middle by :," etc as above
      if (units.length > 0 && units[units.length - 1].type === "box") {
        units.push({
          type: "penalty",
          width: 0,
          cost: 1,
          flagged: false,
          text: "",
        });
      }

      if (hyphenateFn) {
        const chunks = hyphenateFn(w);
        chunks.forEach((c, i) => {
          const b: Box = { type: "box", width: measureFn(c), text: c };
          units.push(b);
          if (i < chunks.length - 1) {
            const hyphen: Penalty = {
              type: "penalty",
              text: "-",
              width: hyphenWidth,
              cost: penaltyCost,
              flagged: true,
            };
            units.push(hyphen);
          }
        });
      } else {
        const b: Box = { type: "box", width: measureFn(w), text: w };
        units.push(b);
      }
    });
    // Add "finishing glue" to space out final line.
    units.push({
      type: "glue",
      width: 0,
      stretch: 10000,
      shrink: 0,
      text: "",
    });

    return units;
  }

  /**
   * Group units of the paragraph by lines:
   * - Penalties in the middle of a line are ignored
   * - Glue at the end is ignored
   * - Consecutive boxes are merged.
   */
  groupByLine = (breaklines: number[]): ParagraphLine[] => {
    const lines = [];
    let start = 0;

    breaklines = breaklines.slice();
    breaklines.push(this.units.length - 1);

    for (const end of breaklines) {
      const units = this.units.slice(start, end);
      const line = [];

      // adjust glues of the line
      for (const unit of units) {
        if (unit.type === "penalty") {
          continue;
        }

        if (
          unit.type === "box" &&
          line.length > 0 &&
          line[line.length - 1].type === "box"
        ) {
          // merge consecutive boxes together
          line[line.length - 1].text += unit.text;
          line[line.length - 1].width += unit.width;
          continue;
        }
        // make a shallow copy so that we don't modify the original unit
        line.push(Object.assign({}, unit));
      }

      if (
        this.units[end].type === "penalty" &&
        this.units[end].text.length > 0
      ) {
        line.push(this.units[end]);
      }

      start = end + 1;
      lines.push(line);
    }

    return lines;
  };

  /** Compute layout of the paragraph */
  layout = (
    lines: ParagraphLine[],
    {
      lineHeight,
      cssLineHeight,
      fontSize,
      align,
      verticalAlign,
      autoLength,
    }: RenderParams
  ): { units: ParagraphRenderedUnit[]; lineLengths: number[] } => {
    const renderingUnits = [];
    const lineLengths = lines.map((line) =>
      line.reduce((a, x) => a + x.width, 0)
    );
    const desiredLens = lines.map((line, i) => this.getLineLength(i));

    if (autoLength) {
      const maxLen = Math.max(...lineLengths);
      for (let i = 0; i < desiredLens.length; i++) {
        if (desiredLens[i] > maxLen) {
          desiredLens[i] = maxLen;
        }
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // find the glue width, we won't adjust the glue width if the line is shorter than desired and not justify
      const len = lineLengths[i];
      const desiredLen = desiredLens[i];
      const nGlues = line.filter((x) => x.type === "glue").length;
      const glueWidth =
        len < desiredLen && align !== "justify"
          ? this.spaceWidth
          : Math.abs(desiredLen - len) / nGlues + this.spaceWidth;

      // verticalAlign === "middle"
      const y = (i + 1) * lineHeight - (fontSize * (cssLineHeight - 1)) / 2;
      let x = 0;

      if (align === "center") {
        x += (desiredLen - len) / 2;
      } else if (align === "right") {
        x += desiredLen - len;
      }

      if (glueWidth === this.spaceWidth) {
        const renderingUnit = Object.assign(
          {
            x,
            y,
            renderedWidth: len,
            lineNumber: i,
          },
          line[0]
        );
        renderingUnit.text = line.map((x) => x.text).join("");
        renderingUnits.push(renderingUnit);
      } else {
        for (const unit of line) {
          const renderedWidth = unit.type === "glue" ? glueWidth : unit.width;
          const renderedUnit = Object.assign(
            {
              x,
              y,
              renderedWidth,
              lineNumber: i,
            },
            unit
          );

          x += renderedWidth;
          renderingUnits.push(renderedUnit);
        }
      }
    }

    return { units: renderingUnits, lineLengths };
  };
}
