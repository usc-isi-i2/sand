import enUsPatterns from "hyphenation.en-us";
import Hypher from "hypher";
import { Paragraph } from "./model";
import { ParagraphOptimizer } from "./optimizer";

const hypher = new Hypher(enUsPatterns);
const hyphenate = (word: string) => {
  return word.length > 4 ? hypher.hyphenate(word) : [word];
};

const measureText = (text: string): number => {
  return {
    "": 0,
    "-": 5.66015625,
    " ": 3.375,
    as: 12.90234375,
    so: 13.37109375,
    ci: 9.6796875,
    a: 6.62109375,
    tion: 21.416015625,
    foot: 22.6171875,
    ball: 20.0625,
    club: 24.123046875,
    "(Q476028)": 62.90625,
    ur: 10.962890625,
    ban: 19.951171875,
    mu: 17.126953125,
    nic: 15.240234375,
    i: 2.90625,
    pal: 16.06640625,
    ity: 12.779296875,
    of: 10.787109375,
    Ger: 18.6796875,
    many: 29.0390625,
    "(Q42744322)": 68.0390625,
  }[text]!;
};

const getParagraph = (text: string, lineLengths: number[]): Paragraph => {
  const separable = ["{", "}", ":", ",", "'", '"', ".", "/"];
  return new Paragraph(
    Paragraph.getUnitsFromText(text, measureText, hyphenate, separable),
    lineLengths
  );
};

test("test line breaking", () => {
  const testcases = [
    {
      text: "association football club (Q476028)",
      lineLengths: [72.81291138252885, 93.94375985662911, 98.52084806780745],
      breakpoints: [9, 15],
      wrappedText: ["association", "football club", "(Q476028)"],
    },
    {
      text: "urban municipality of Germany (Q42744322)",
      lineLengths: [83.46088942732398, 102.41791843227435, 106.6318784604304],
      breakpoints: [9, 19],
      wrappedText: ["urban munici-", "pality of Germany", "(Q42744322)"],
    },
  ];

  for (const [idx, testcase] of Array.from(testcases.entries())) {
    const paragraph = getParagraph(testcase.text, testcase.lineLengths);
    const breaker = new ParagraphOptimizer(paragraph);
    const { breakpoints, demerits } = breaker.optimize();
    const lines = paragraph.groupByLine(breakpoints);
    const actualLens = lines.map((line) =>
      line.reduce((a, x) => a + x.width, 0)
    );
    const wrappedText = lines.map((line) => line.map((x) => x.text).join(""));

    // NOTE: uncomment for debugging purposes
    // strategy for debugging is to find a better solution and compute the demerits
    // for each sentence and compare them to the expected demerits
    if (idx === 1) {
      console.log({
        demerits,
        actualLens,
        units: paragraph.units.map((u, i) => {
          return [i, u.text, u.width];
        }),
        "0-9": breaker.computeParagraphDemerits(0, 9, [], 0),
        "10-19": breaker.computeParagraphDemerits(10, 19, [], 1),
        "20-21": breaker.computeParagraphDemerits(20, 21, [], 2),
        "0-19": breaker.computeParagraphDemerits(0, 19, [9], 0),
        "0-21": breaker.computeParagraphDemerits(0, 21, [9, 19], 0),
      });
    }

    expect(wrappedText).toEqual(testcase.wrappedText);
    expect(breakpoints).toEqual(testcase.breakpoints);

    for (let i = 0; i < actualLens.length; i++) {
      expect(actualLens[i]).toBeLessThanOrEqual(paragraph.getLineLength(i));
    }
  }
});
