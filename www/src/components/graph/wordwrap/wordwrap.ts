import enUsPatterns from "hyphenation.en-us";
import Hypher from "hypher";
import { ParagraphOptimizer } from "./optimizer";
import { Paragraph, ParagraphRenderedUnit } from "./model";

export type ElementFontConfig = {
  font?: string;
  fontSize: number;
  fontFamily: string;
};

export class WordWrap {
  protected measureCtx: CanvasRenderingContext2D;
  protected circleLayout: CircleLayout;
  protected hypher: Hypher;

  public readonly font: string;
  public readonly fontFamily: string;
  public readonly fontSize: number;
  public readonly cssLineHeight: number = 1.428;
  // lineHeight in pixel (different from cssLineHeight property)
  public readonly lineHeight: number;
  public readonly spaceWidth: number;
  public readonly separable: string[] = [
    "{",
    "}",
    ":",
    ",",
    "'",
    '"',
    ".",
    "/",
  ];

  constructor(
    fontCfg: ElementFontConfig,
    layoutCfg?: { lineHeight?: number; separable?: string[] }
  ) {
    const canvas = document.createElement("canvas");
    this.measureCtx = canvas.getContext("2d")!;
    this.spaceWidth = this.measureText(" ");

    this.font = fontCfg.font || `${fontCfg.fontSize}px ${fontCfg.fontFamily}`;
    this.fontFamily = fontCfg.fontFamily;
    this.fontSize = fontCfg.fontSize;
    this.measureCtx.font = this.font;

    this.hypher = new Hypher(enUsPatterns);

    if (layoutCfg !== undefined) {
      if (layoutCfg.lineHeight !== undefined) {
        this.cssLineHeight = layoutCfg.lineHeight;
      }
      if (layoutCfg.separable !== undefined) {
        this.separable = layoutCfg.separable;
      }
    }

    this.lineHeight = this.fontSize * this.cssLineHeight;
    this.circleLayout = new CircleLayout(this);
  }

  /** Generate a plan to render text. Note that font size is automatically figured out from the given container */
  wrapText = (
    text: string,
    desiredLineLengths: number | number[],
    align: "justify" | "left" | "center" | "right" = "justify"
  ): {
    units: ParagraphRenderedUnit[];
    width: number;
    height: number;
  } => {
    const paragraph = new Paragraph(
      Paragraph.getUnitsFromText(
        text,
        this.measureText,
        this.hyphenate,
        this.separable
      ),
      desiredLineLengths
    );
    // TODO: uncomment to debug
    // console.log(
    //   text,
    //   desiredLineLengths,
    //   JSON.stringify(
    //     Object.fromEntries(paragraph.units.map((u) => [u.text, u.width]))
    //   )
    // );
    const breakpoints = new ParagraphOptimizer(paragraph).optimize()
      .breakpoints;
    const { units, lineLengths } = paragraph.layout(
      paragraph.groupByLine(breakpoints),
      {
        align,
        cssLineHeight: this.cssLineHeight,
        fontSize: this.fontSize,
        lineHeight: this.lineHeight,
        verticalAlign: "middle",
        autoLength: true,
      }
    );

    const width = Math.max(...lineLengths);
    const height = (breakpoints.length + 1) * this.lineHeight;

    return { units: units, width, height };
  };

  /** Wrap text in a circle */
  wrapTextCircle = (
    text: string,
    maxRadius: number = 1024,
    acceptableError: number = 10
  ): {
    units: ParagraphRenderedUnit[];
    radius: number;
  } => {
    let radius =
      this.circleLayout.findRadius(
        this.measureText(text),
        maxRadius,
        acceptableError
      ) + 12;
    const circleLayout = this.circleLayout.getLayout(radius);
    const {
      lines: lineLengths,
      // centralLine,
      // linesY,
    } = circleLayout;
    const { units, width } = this.wrapText(
      text,
      lineLengths.slice(0, 3),
      "center"
    );
    const nLines = Math.max(...units.map((item) => item.lineNumber)) + 1;

    // shift the location to the center of the circle
    radius = width / 2;
    const deltaX = -radius;
    const deltaY =
      -(nLines % 2 === 1 ? (nLines - 1) / 2 : nLines / 2) * this.lineHeight -
      this.lineHeight / 2;

    for (let itemLayout of units) {
      itemLayout.x += deltaX;
      itemLayout.y += deltaY;
    }

    return {
      units: units,
      radius,
    };
  };

  /** Hyphenate a long word (at least 4 characters) */
  hyphenate = (word: string) => {
    return word.length > 4 ? this.hypher.hyphenate(word) : [word];
  };

  /** Get approximate width of a sentence of n words */
  getApproximateWidth = (nWords: number) => {
    return nWords * this.measureText("abcij ");
  };

  /**
   * Return the computed CSS `font` property value for an element.
   */
  static getCssFont = (container: Element) => {
    const style = getComputedStyle(container);
    const { fontStyle, fontVariant, fontWeight, fontSize, fontFamily } = style;
    return {
      font: `${fontStyle!} ${fontVariant!} ${fontWeight!} ${fontSize!} ${fontFamily}`,
      fontSize: parseFloat(fontSize),
      fontFamily,
    };
  };

  /**
   * Measure the width of `text` as it would appear if rendered with a given computed `font` style.
   */
  measureText = (text: string) => {
    return this.measureCtx.measureText(text).width;
  };
}

export class CircleLayout {
  protected lineBreak: WordWrap;
  protected lineHeight: number;
  protected radius2layout: {
    [k: number]: {
      lines: number[];
      linesY: number[];
      totalLength: number;
      centralLine: number;
    };
  };

  constructor(lineBreak: WordWrap) {
    this.lineBreak = lineBreak;
    this.lineHeight = lineBreak.lineHeight;
    this.radius2layout = {};
  }

  findRadius = (
    textLength: number,
    maxRadius: number = 1024,
    acceptableError: number = 10
  ): number => {
    // first step is to find the lower bound using binary search
    let [start, end] = [0, maxRadius];
    let lowerbound = undefined;
    for (let i = 0; i < maxRadius; i++) {
      if (end - start === 1) {
        lowerbound = end;
        break;
      }

      const radius = Math.ceil((start + end) / 2);
      const l = this.getLayout(radius).totalLength;

      if (l < textLength) {
        start = radius;
        continue;
      }

      if (l - textLength > acceptableError) {
        end = radius;
        continue;
      }
      lowerbound = radius;
      break;
    }

    if (lowerbound === undefined) {
      throw new Error(
        `The text of ${textLength} is too long to render in a circle that has the maximum radius: ${maxRadius} - ${
          this.getLayout(maxRadius).totalLength
        }`
      );
    }

    // next step is to find the upper bound assuming that the longest word
    // is going to be breaked at every line (textLength + longestWord * nLines)
    return lowerbound;
  };

  /** Get layout (line lengths) of a given radius */
  getLayout = (radius: number) => {
    if (this.radius2layout[radius] === undefined) {
      const n = this.computeHalfNumberOfLines(radius);
      // small to large to small
      const lines = [];
      const linesY = [];
      for (let i = n; i > 0; i--) {
        lines.push(this.computeLineLength(i, radius));
        linesY.push(radius - this.lineHeight * (i + 1 / 2));
      }
      lines.push(this.computeCentralLineLength(radius));
      linesY.push(radius - this.lineHeight / 2);
      for (let i = n - 1; i >= 0; i--) {
        lines.push(lines[i]);
        linesY.push(radius + this.lineHeight * (i - 1 / 2));
      }

      this.radius2layout[radius] = {
        lines,
        linesY,
        centralLine: lines[n],
        totalLength: lines.reduce((a, b) => a + b),
      };
    }

    return this.radius2layout[radius];
  };

  /** Number of lines can fit in a half of circle without central line */
  computeHalfNumberOfLines = (radius: number) => {
    return Math.floor((radius - this.lineHeight / 2) / this.lineHeight);
  };

  /** Compute line height of non-central lines */
  computeLineLength = (index: number, radius: number) => {
    return Math.sqrt(radius ** 2 - (this.lineHeight * index) ** 2) * 2;
  };

  computeCentralLineLength = (radius: number) => {
    return Math.sqrt(radius ** 2 - (this.lineHeight / 2) ** 2) * 2;
  };
}
