import { Paragraph, ParagraphUnit } from "./model";

const cacheFn = <F extends (...args: any) => any>(
  fn: F,
  cache: { [key: string]: ReturnType<F> }
): F => {
  return ((...args: any) => {
    const key = args.join(":");
    if (cache[key] === undefined) {
      cache[key] = fn(...args);
    }
    return cache[key];
  }) as unknown as F;
};

/**
 * Optimize paragraph to fit lines.
 *
 * Using a score function similar to Knuth-Plass algorithm. Differences:
 * 1. badness of a line is change to <adjustment_ratio>^3, not 100 * <adjustment_ratio>^3 to avoid
 *    making a number too big
 * 2. the ability to brea, super long word (no glue). the <adjustment_ratio> is undefined in Knuth-Plass algorithm, making
 *    badness becomes infinity. Hence, the algorithm avoids breaking it at all cost. We set the glue size to be 0.1 so that
 *    the badness is finite.
 */
export class ParagraphOptimizer {
  protected paragraph: ParagraphUnit[];
  protected getDesiredLineLength: (i: number) => number;
  protected cacheLineLengths: { [key: string]: number } = {};
  protected cacheLineDemerits: { [key: string]: number } = {};
  protected cacheParagraphDemerits: { [key: string]: number } = {};
  protected cacheParagraphBreakpoints: {
    [key: string]: { breakpoints: number[]; demerits: number };
  } = {};

  constructor(paragraph: Paragraph) {
    this.paragraph = paragraph.units.map((item) => {
      item = Object.assign({}, item);
      item.width = item.width / 16;
      if (item.type === "glue") {
        item.stretch = item.stretch / 16;
        item.shrink = item.shrink / 16;
      }
      return item;
    });
    this.getDesiredLineLength = (i: number) => paragraph.getLineLength(i) / 16;
  }

  /**
   * Optimize a paragraph by minimizing a score (demerits) similar to the one defined by Knuth-Plass algorithm
   *
   * Example: optimize returns breakpoints [4, 8] meaning it creates 3 lines:
   * [0, 4], [5, 8], [9, <paragraph.length - 1>]
   *
   * @see this.optimizeParagraph for more information
   */
  optimize = () => {
    return this.optimizeParagraph(0, this.paragraph.length - 1, 0);
  };

  /**
   * Optimize a (sub) paragraph from [start, end] (inclusive) by minimizing the predefined score
   *
   * Example: optimizeParagraph(0, 15, 0) returns breakpoints [4, 8] meaning it creates 3 lines:
   * [0, 4], [5, 8], [9, 15]
   *
   * @param start
   * @param end (inclusive)
   * @param nPreviousLines the number of lines of previous paragraphs
   *
   * @returns breakpoints & the score (demerits)
   */
  optimizeParagraph = cacheFn(
    (
      start: number,
      end: number,
      nPreviousLines: number
    ): { breakpoints: number[]; demerits: number } => {
      const lineAdjustment = this.computeLineAdjustment(
        start,
        end,
        nPreviousLines // base 0
      );
      if (lineAdjustment !== undefined && lineAdjustment >= 0) {
        // this paragraph can fit in a whole line -- no need to break it up
        return {
          breakpoints: [],
          demerits: this.computeLineDemerits(start, end, nPreviousLines),
        };
      }

      const optimalSplit = {
        caret: -1,
        demerits: Infinity,
        breakpoints: [] as number[],
      };

      // work incrementally from right to left -- but only consider breaking points
      for (let caret = end - 1; caret > start; caret--) {
        if (this.paragraph[caret].type === "box") continue;

        const prevParagraphBreakpoints = this.optimizeParagraph(
          start,
          caret,
          nPreviousLines
        );
        const nextParagraphBreakpoints = this.optimizeParagraph(
          caret + 1,
          end,
          nPreviousLines +
            (prevParagraphBreakpoints.breakpoints.length > 0
              ? prevParagraphBreakpoints.breakpoints.length + 1
              : 0)
        );

        if (
          prevParagraphBreakpoints.demerits +
            nextParagraphBreakpoints.demerits <
          optimalSplit.demerits
        ) {
          optimalSplit.caret = caret;
          optimalSplit.demerits =
            prevParagraphBreakpoints.demerits +
            nextParagraphBreakpoints.demerits;
          optimalSplit.breakpoints =
            prevParagraphBreakpoints.breakpoints.slice();
          optimalSplit.breakpoints.push(caret);
          optimalSplit.breakpoints = optimalSplit.breakpoints.concat(
            nextParagraphBreakpoints.breakpoints
          );
        }
      }

      return {
        breakpoints: optimalSplit.breakpoints,
        demerits: optimalSplit.demerits,
      };
    },
    this.cacheParagraphBreakpoints
  );

  /**
   * Compute length of units from [start, end] (inclusive) if rendered in a single line.
   * We only count items that are box, glue & only the penalty if it's the last item as penalties
   * won't be rendered in the line.
   *
   * @param start
   * @param end -- inclusive
   */
  computeLineLength = cacheFn((start: number, end: number) => {
    let len = 0;
    for (let i = start; i < end; i++) {
      if (this.paragraph[i].type === "penalty") continue;

      len += this.paragraph[i].width;
    }

    // add the width of the last penalty item only if break is forced (break words are added hyphen)
    if (this.paragraph[end].type === "penalty") {
      // hyphen will have a non zero width
      len += this.paragraph[end].width;
    }
    return len;
  }, this.cacheLineLengths);

  /**
   * Compute the elasticity of a line of units from [start, end] (inclusive)
   * @param start
   * @param end -- inclusive
   */
  computeLineElastic = (start: number, end: number) => {
    let stretchability = 0;
    let shrinkability = 0;

    for (let i = start; i <= end; i++) {
      const item = this.paragraph[i];
      if (item.type === "glue") {
        stretchability += item.stretch;
        shrinkability += item.shrink;
      }
    }

    return { stretchability, shrinkability };
  };

  /**
   * Compute the adjustment ratio of a line
   *
   * @param start
   * @param end
   * @param lineNumber
   * @returns
   */
  computeLineAdjustment = (start: number, end: number, lineNumber: number) => {
    const len = this.computeLineLength(start, end);
    const desiredLength = this.getDesiredLineLength(lineNumber);

    if (len === desiredLength) {
      return 0;
    }

    const elastic = this.computeLineElastic(start, end);
    if (len < desiredLength) {
      if (elastic.stretchability < 0) {
        return undefined;
      }
      // This is modified from Knuth-Plass algorithm.
      if (elastic.stretchability === 0) {
        return (desiredLength - len) / 0.1;
      }
      return (desiredLength - len) / elastic.stretchability;
    }
    if (elastic.shrinkability <= 0) {
      return undefined;
    }
    return (desiredLength - len) / elastic.shrinkability;
  };

  computeLineBadness = (start: number, end: number, lineNumber: number) => {
    const r = this.computeLineAdjustment(start, end, lineNumber);
    if (r === undefined || r < -1) {
      return -Infinity;
    }
    // original formula: r ** 3 * 100
    return r ** 3;
  };

  computeLineDemerits = cacheFn(
    (start: number, end: number, lineNumber: number) => {
      const lastLineItem = this.paragraph[end];
      const linePenalty =
        lastLineItem.type === "penalty" ? lastLineItem.cost : 0;
      const lineBadness = this.computeLineBadness(start, end, lineNumber);
      const additionalPenalty = 0;

      if (linePenalty >= 0) {
        return (1 + lineBadness + linePenalty) ** 2 + additionalPenalty;
      } else if (linePenalty === -Infinity) {
        return (1 + lineBadness) ** 2 + additionalPenalty;
      } else {
        return (1 + lineBadness) ** 2 - linePenalty ** 2 + additionalPenalty;
      }
    },
    this.cacheLineDemerits
  );

  computeParagraphDemerits = (
    start: number,
    end: number,
    breakpoints: number[],
    nPreviousLines: number
  ) => {
    let caret = start;
    let demerits = 0;
    for (let i = 0; i < breakpoints.length; i++) {
      demerits += this.computeLineDemerits(
        caret,
        breakpoints[i],
        nPreviousLines + i
      );
      caret = breakpoints[i] + 1;
    }
    demerits += this.computeLineDemerits(
      caret,
      end,
      nPreviousLines + (breakpoints.length > 0 ? breakpoints.length + 1 : 0)
    );

    return demerits;
  };
}
