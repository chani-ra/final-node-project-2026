import LearningCategory from "../../models/learningCategory.model.js";
import LearningSubcategory from "../../models/learningSubcategory.model.js";
import { LEARNING_TOPICS } from "./topics.js";

// Safe to run at startup: inserts only missing catalog entries.
// It never updates or removes existing categories or learners' work.
export async function seedLearningCatalog() {
  for (const entry of LEARNING_TOPICS) {
    const category = await LearningCategory.findOneAndUpdate(
      { slug: entry.slug },
      { $setOnInsert: { slug: entry.slug, name: entry.name } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    for (const subcategory of entry.subcategories) {
      await LearningSubcategory.updateOne(
        { category: category._id, slug: subcategory.slug },
        {
          $setOnInsert: {
            category: category._id,
            slug: subcategory.slug,
            name: subcategory.name,
          },
        },
        { upsert: true }
      );
    }
  }
}

export async function listLearningCategories() {
  const [categories, subcategories] = await Promise.all([
    LearningCategory.find().select("name slug").sort({ name: 1 }).lean(),
    LearningSubcategory.find().select("name slug category").sort({ name: 1 }).lean(),
  ]);

  return categories.map((category) => ({
    ...category,
    subcategories: subcategories.filter(
      (item) => String(item.category) === String(category._id)
    ),
  }));
}
