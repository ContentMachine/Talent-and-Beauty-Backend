const mongoose = require("mongoose");
const User = require("./User"); // adjust the path as needed

const talentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
    },
    location: {
      type: String,
      required: [true, "Location is required"],
    },
    dateOfBirth: {
      type: Date,
      required: [true, "Date of birth is required"],
    },
    talentCategory: {
      type: String,
      required: [true, "Talent category is required"],
      enum: [
        "actor",
        "model",
        "voice-artist",
        "musician",
        "dancer",
        "influencer",
        "other",
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

talentSchema.index({
  firstName: "text",
  lastName: "text",
  bio: "text",
  specialties: "text",
});
talentSchema.index({ talentCategory: 1, arconApprovalStatus: 1 });
talentSchema.index({ location: 1 });

talentSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// ✅ Shared function to sync Talent → User
async function syncTalentToUser(talentDoc) {
  if (!talentDoc || !talentDoc.user) return;

  const user = await User.findById(talentDoc.user);
  if (!user) return;

  // Only sync if user role is "talent"
  if (user.role !== "talent") return;

  // Copy relevant fields
  user.firstName = talentDoc.firstName;
  user.lastName = talentDoc.lastName;
  user.name = `${talentDoc.firstName} ${talentDoc.lastName}`;
  user.phone = talentDoc.phone;
  user.location = talentDoc.location;
  user.dateOfBirth = talentDoc.dateOfBirth;
  user.talentCategory = talentDoc.talentCategory;
  user.bio = talentDoc.bio;
  user.experience = talentDoc.experience;
  user.specialties = talentDoc.specialties;
  user.portfolio = talentDoc.portfolio;
  user.nin = talentDoc.nin;
  user.photos = talentDoc.photos;
  user.socialMedia = talentDoc.socialMedia;
  user.arconApprovalStatus = talentDoc.arconApprovalStatus;
  user.arconApprovalDate = talentDoc.arconApprovalDate;
  user.arconRejectionReason = talentDoc.arconRejectionReason;
  user.rating = talentDoc.rating;
  user.reviewCount = talentDoc.reviewCount;
  user.isPubliclyVisible = talentDoc.isPubliclyVisible;
  user.completedJobs = talentDoc.completedJobs;

  // You can store the whole object for reference if you like:
  user.talentProfile = talentDoc.toObject();

  await user.save();
}

// ✅ When a new talent is created
talentSchema.post("save", async function (doc, next) {
  try {
    await syncTalentToUser(doc);
    next();
  } catch (err) {
    console.error("Error syncing Talent to User (save):", err.message);
    next(err);
  }
});

// ✅ When a talent is updated
talentSchema.post("findOneAndUpdate", async function (doc, next) {
  try {
    if (doc) await syncTalentToUser(doc);
    next();
  } catch (err) {
    console.error("Error syncing Talent to User (update):", err.message);
    next(err);
  }
});

module.exports = mongoose.model("Talent", talentSchema);
