// Declarative catalog: the same data is used by the idempotent DB seed and tests.
// Adding a topic here does not modify existing courses or chat conversations.
export const LEARNING_TOPICS = Object.freeze([
  {
    slug: "grammar", name: "Grammar",
    subcategories: [
      { slug: "present-simple", name: "Present Simple" },
      { slug: "past-simple", name: "Past Simple" },
      { slug: "future-tenses", name: "Future Tenses" },
      { slug: "present-perfect", name: "Present Perfect" },
    ],
  },
  {
    slug: "vocabulary", name: "Vocabulary",
    subcategories: [
      { slug: "everyday-english", name: "Everyday English" },
      { slug: "travel", name: "Travel & Directions" },
      { slug: "school", name: "School & Studies" },
    ],
  },
  {
    slug: "conversation", name: "Conversation",
    subcategories: [
      { slug: "introductions", name: "Introductions" },
      { slug: "daily-conversations", name: "Daily Conversations" },
      { slug: "opinions", name: "Expressing Opinions" },
    ],
  },
  {
    slug: "reading", name: "Reading",
    subcategories: [
      { slug: "short-stories", name: "Short Stories" },
      { slug: "reading-comprehension", name: "Reading Comprehension" },
    ],
  },
  {
    slug: "listening", name: "Listening",
    subcategories: [
      { slug: "listening-basics", name: "Listening Basics" },
      { slug: "listening-practice", name: "Everyday Listening" },
      { slug: "short-stories", name: "Short Stories" },
    ],
  },
]);
