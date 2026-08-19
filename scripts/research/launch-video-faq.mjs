/**
 * The FAQ on The Launch Video Index, and the source of its FAQPage JSON-LD.
 *
 * ONE definition, two consumers — the visible <section> in the study markup and the structured data
 * — because Google drops the rich result when FAQ markup does not match visible page content.
 * test-launch-video-pages.mjs fails if this copy drifts from launch-video-index.mjs.
 *
 * Written to the house AEO rules: questions phrased the way a founder would type them, answers that
 * OPEN with the answer. Every number traces to the verified 194-video corpus.
 */
export const LAUNCH_VIDEO_FAQ = [
  {
    question: "What makes a startup launch video go viral?",
    answer:
      "Not clarity — nearly every video in our verified 194-video study was clear, winners and losers alike. What separated them was emotional pull: a strong hook, dynamic pacing, surprise, and genuine differentiation. Videos with a strong opening earned roughly 90 times the median views of ones with a weak opening, and strongly differentiated videos beat generic ones about 64 times.",
  },
  {
    question: "How long should a startup launch video be?",
    answer:
      "Longer than the common advice suggests. The median video in our corpus ran 52 seconds, and clips under 15 seconds were the worst-performing length bucket. Ranked by views, the top quartile ran a median of 56 seconds versus 37 for the bottom. Give the video room to build; flat pacing kills a launch, not length.",
  },
  {
    question: "How should a launch video open?",
    answer:
      "On a face or on the product already in motion, not on a title card. Videos that opened on a human face outperformed ones that opened on a text card by about 6 times. A straight product demo was the most common open and only middling. The worst common move was setting up the premise with text before anything happens.",
  },
  {
    question: "Should a startup launch video be vertical or landscape?",
    answer:
      "Landscape, for a launch film. In our data, 16:9 landscape videos earned about 11 times the median views of 9:16 vertical ones, and the effect held even within product-demo videos alone. A launch film gets watched at a desk, quoted in a thread, and embedded in a blog post, and landscape wins all three. Save vertical for TikTok and Reels.",
  },
  {
    question: "When is the best time to post a launch video on X?",
    answer:
      "Weekday midday. In our corpus, launches posted on a Tuesday had more than thirty times the median reach of ones posted on a Sunday, and the 9am to 3pm US Eastern window beat the late afternoon and evening. Timing is the weakest lever and is confounded by who posts when, so treat it as a small free edge on top of a strong video, not a substitute for one.",
  },
  {
    question: "Why do most startup launch videos fail?",
    answer:
      "They're clear but dead. In the study, the bottom cohort almost entirely lacked emotional pull, surprise and differentiation. A launch video can be perfectly legible and still be completely skippable, and that's the default failure, not confusion. Only 3 videos in the whole study hit hard emotionally, while nearly nine in ten were clear.",
  },
];
