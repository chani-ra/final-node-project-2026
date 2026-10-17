import LearningPrompt from "../models/learningPrompt.model.js";
import { listProviders } from "../service/learning/providers/providerCatalog.js";
import { listLearningCategories } from "../service/learning/catalog.service.js";
import { generateLearningLesson, getLearningHistory } from "../service/learning/learning.service.js";
import { adminHistoryQuerySchema, historyQuerySchema, learningPromptSchema } from "../validation/learning.validation.js";

const invalid = (res, message) => res.status(400).json({ success: false, message });

export const LearningController = {
  async categories(req, res) {
    res.json({ success: true, categories: await listLearningCategories() });
  },

  async providers(req, res) {
    res.json({ success: true, providers: listProviders() });
  },

  async create(req, res) {
    const { error, value } = learningPromptSchema.validate(req.body);
    if (error) return invalid(res, error.details[0].message);
    const item = await generateLearningLesson({ userId: req.user.id, ...value });
    res.status(201).json({ success: true, lesson: item });
  },

  async myHistory(req, res) {
    const { error, value } = historyQuerySchema.validate(req.query);
    if (error) return invalid(res, error.details[0].message);
    // Students cannot request another user's records, even with an extra userId.
    const { page, limit, categoryId } = value;
    res.json({ success: true, ...await getLearningHistory({
      userId: req.user.id, categoryId, page, limit,
    }) });
  },

  async detail(req, res) {
    if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return invalid(res, "מזהה לא תקין");
    const item = await LearningPrompt.findOne({ _id: req.params.id, user: req.user.id })
      .populate("category", "name")
      .populate("subcategory", "name")
      .lean();
    if (!item) return res.status(404).json({ success: false, message: "השיעור לא נמצא" });
    res.json({ success: true, lesson: item });
  },

  async adminHistory(req, res) {
    const { error, value } = adminHistoryQuerySchema.validate(req.query);
    if (error) return invalid(res, error.details[0].message);
    res.json({ success: true, ...await getLearningHistory(value) });
  },
};
