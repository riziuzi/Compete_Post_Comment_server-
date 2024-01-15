const mongoose = require("mongoose");
// Golden rule for flattening nested models : a datafield is given its own Model + its id (Aatma) is left in the Old parent's field --if--> it was itself the 2nd or higher level of field + it is an array + is needed in queries, to make it 1st level query
// Note: 1st 2nd ... lvl queries mean that the field in Model, field in field in model ...

const Comment = new mongoose.Schema({
  message: {
    type: String,
    required: true
  },
  lastUpdatedDate: {
    type: Number,
    default: () => Date.now()
  },
  createdDate: {
    type: Number,
    default: () => Date.now()
  },
  userId: {
    type: String,       
    required: true
  },
  postId: {
    type: String,       
    required: true
  },
  likes: [Object], // Likes _id (Flattening of Likes)


  parentId: String,     
  children: [String]    
})

const Like = new mongoose.Schema({
  commentId: {
    type: String,
    default: '0'
  },
  userId: String,
  postId: {
    type: String,
    default: '0'
  },
  createdDate: {
    type: Number,
    default: () => Date.now()
  },
});

// Middleware to update lastUpdatedDate before saving
Comment.pre('save', function (next) {
  this.lastUpdatedDate = new Date().getTime();
  next();
});



exports.CommentModel = mongoose.model("Comment", Comment);
exports.LikeModel = mongoose.model("Like", Like);
