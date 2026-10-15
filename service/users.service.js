import User from "../models/users.model.js";
import bcrypt from "bcryptjs";

const createUser = async (userData) => {
  const existingUser = await User.findOne({ email: userData.email });
  if (existingUser) {
    throw new Error("User already exists");
  }

  const hashedPassword = await bcrypt.hash(userData.password, 10);

  const user = new User({
    ...userData,
    password: hashedPassword,
  });

  return await user.save();
};

const UserService = {
 filterUserData: (user) => ({
  id: user._id?.toString(),
  _id: user._id?.toString(),
  email: user.email,
  username: user.username,
  role: user.role,
  phone: user.phone,
  age: user.age,
  gender: user.gender,
  parentOrChild: user.parentOrChild,
  favoriteHobbies: user.favoriteHobbies || [],
  expectations: user.expectations || [],
  englishLevel: user.englishLevel || "beginner",
  createdAt: user.createdAt,
}),

  register: async (userData) => {
    userData.role = "student";
    return await createUser(userData);
  },

  addAdminByAdmin: async (userData, currentUser) => {
    if (!currentUser || currentUser.role !== "admin") {
      throw new Error("Access denied. Only admins can add users.");
    }

    userData.role = "admin";
    return await createUser(userData);
  },

  addTeacherByAdmin: async (userData, currentUser) => {
    if (!currentUser || currentUser.role !== "admin") {
      throw new Error("Access denied. Only admins can add users.");
    }

    userData.role = "teacher";
    return await createUser(userData);
  },

  login: async (email, password) => {
    if (
      process.env.NODE_ENV === "production" &&
      ["admin@englishplatform.com", "teacher@englishplatform.com"]
        .includes(email?.trim().toLowerCase())
    ) {
      throw new Error("Invalid credentials");
    }

    const user = await User.findOne({ email });

    if (!user) {
      throw new Error("Invalid credentials");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new Error("Invalid credentials");
    }

    return UserService.filterUserData(user);
  },

  getUserById: async (id) => {
    return await User.findById(id);
  },

  getUserProfile: async (id) => {
    const user = await User.findById(id).select("-password -__v");

    if (!user) {
      throw new Error("User not found");
    }

    return UserService.filterUserData(user);
  },

  updateUser: async (id, userData) => {
    const forbiddenFields = ["password", "email"];

    for (const field of forbiddenFields) {
      delete userData[field];
    }

    const updatedUser = await User.findByIdAndUpdate(id, userData, {
      new: true,
      runValidators: true,
    }).select("-password -__v");

    return updatedUser;
  },

  updateOwnProfile: async (id, profileData) => {
    const allowedFields = [
      "username",
      "phone",
      "age",
      "favoriteHobbies",
      "expectations",
      "englishLevel",
      "emailNotifications",
    ];

    const filteredData = {};

    for (const field of allowedFields) {
      if (profileData[field] !== undefined) {
        filteredData[field] = profileData[field];
      }
    }

    const updatedUser = await User.findByIdAndUpdate(id, filteredData, {
      new: true,
      runValidators: true,
    }).select("-password -__v");

    return updatedUser;
  },

  getAllUsers: async () => {
    return await User.find({}).select("-password -__v").sort({ createdAt: -1 });
  },

  deleteUser: async (id) => {
    return await User.findByIdAndDelete(id);
  },

  enrollUserInCourse: async (userId, courseId) => {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error("User not found");
    }

    if (user.enrolledCourses.includes(courseId)) {
      throw new Error("Already enrolled in this course");
    }

    user.enrolledCourses.push(courseId);
    await user.save();

    return user;
  },

  createFirstAdmin: async (userData) => {
    const existingAdmin = await User.findOne({ role: "admin" });

    if (existingAdmin) {
      throw new Error("Admin already exists");
    }

    userData.role = "admin";
    return await createUser(userData);
  },
};

export default UserService;