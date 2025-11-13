const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: function () {
        return !this.isAnonymous;
      },
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    role: {
      type: String,
      enum: ["superadmin", "admin", "client", "talent", "arcon"],
      default: "talent",
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    passwordResetToken: String,
    passwordResetExpire: Date,
    passwordSetToken: String,
    passwordSetExpire: Date,

    // 🧩 Talent-related synced fields
    phone: String,
    location: String,
    dateOfBirth: Date,
    talentCategory: {
      type: String,
      enum: [
        "actor",
        "model",
        "voice-artist",
        "musician",
        "dancer",
        "influencer",
        "other",
        null,
      ],
    },
    bio: {
      type: String,
      maxlength: [1000, "Bio cannot exceed 1000 characters"],
    },
    experience: String,
    specialties: [String],
    portfolio: [
      {
        url: String,
        publicId: String,
        type: {
          type: String,
          enum: ["image", "video"],
        },
        caption: String,
      },
    ],
    nin: {
      documentUrl: String,
      publicId: String,
      verified: {
        type: Boolean,
        default: false,
      },
      submittedToARCON: {
        type: Boolean,
        default: false,
      },
      arconSubmissionDate: Date,
    },
    photos: [
      {
        url: String,
        publicId: String,
      },
    ],
    socialMedia: {
      instagram: String,
      twitter: String,
      website: String,
      other: String,
    },
    arconApprovalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "under-review"],
      default: "pending",
    },
    arconApprovalDate: Date,
    arconRejectionReason: String,
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    isPubliclyVisible: {
      type: Boolean,
      default: false,
    },
    completedJobs: {
      type: Number,
      default: 0,
    },

    // 🧩 Embedded snapshot of full talent object (optional)
    talentProfile: {
      type: Object,
      default: null,
    },

    // System fields
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for full name
userSchema.virtual("fullName").get(function () {
  return this.name || `${this.firstName || ""} ${this.lastName || ""}`.trim();
});

// Virtual for linking Talent
userSchema.virtual("profile", {
  ref: function () {
    return this.role === "talent" ? "Talent" : "Client";
  },
  localField: "_id",
  foreignField: "user",
  justOne: true,
});

// 🔒 Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// 🔑 Match entered password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// 🔁 Generate password reset token
userSchema.methods.generatePasswordResetToken = function () {
  const crypto = require("crypto");
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.passwordResetExpire = Date.now() + 30 * 60 * 1000; // 30 min
  return resetToken;
};

// 🔁 Generate password set token
userSchema.methods.generatePasswordSetToken = function () {
  const crypto = require("crypto");
  const setToken = crypto.randomBytes(32).toString("hex");
  this.passwordSetToken = crypto
    .createHash("sha256")
    .update(setToken)
    .digest("hex");
  this.passwordSetExpire = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  return setToken;
};

module.exports = mongoose.model("User", userSchema);
