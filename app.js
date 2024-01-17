const express = require("express")
const app = express()
// import libraries
const cors = require("cors")
const mongoose = require("mongoose")
const { CommentModel, LikeModel } = require("./database")


db = "mongodb+srv://riziuzi:UqeRz3Targyx2xKO@postscommentscluster.pyzlowg.mongodb.net/?retryWrites=true&w=majority"
mongoose.connect(db)
  .then(() => { console.log("MongoDB Connected") })
  .catch(err => console.log(err))
  app.use(cors({
    origin: 'https://compete-j0qb.onrender.com',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
}))
app.use(express.json());



app.get("/", (req, res) => {
  res.send("Compete_Post_Comment_server")
})
app.get("/count-comment", async (req, res) => {
  console.log(1)
  const postId = req.query.postId;
  try {
    if (!postId) {
      return res.status(401).json({
        error: 'Missing required fields'
      });
    }

    const commentCount = await CommentModel.countDocuments({ postId: postId });

    res.status(200).json({
      success: true,
      message: 'Comment count retrieved successfully',
      commentCount: commentCount
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: 'Internal Server Error'
    });
  }
});
app.get("/load-comment", async (req, res) => {
  const postId = req.query.postId
  if (!postId) {
    return res.status(400).json({ error: `postId is required` })
  }
  console.log(postId)
  try {
    const comments = await CommentModel.find({ postId: postId }).sort({ createdDate: -1 });
    if (!comments) {
      return res.status(404).json({
        success: false,
        error: `Comments not found`
      })
    }
    console.log(comments)
    res.status(200).send({
      success: true,
      comments: comments
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Internal Server error`
    })
  }
})
app.post("/load-comments", async (req, res) => {
  const postIds = req.body.postIds;

  if (!postIds || !Array.isArray(postIds)) {
    return res.status(400).json({ error: 'postIds must be provided as an array in the request body' });
  }

  try {
    const comments = await CommentModel.find({ postId: { $in: postIds } }).sort({ createdDate: -1 });

    if (!comments || comments.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Comments not found for the provided postIds'
      });
    }
    const likes = await LikeModel.find({ postId: { $in: postIds } });

    res.status(200).json({
      success: true,
      comments: comments,
      likes: likes,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error'
    });
  }
});


app.get("/delete-comment", async (req, res) => {                            // future: needs authentication
  try {
    const commentId = req.query.commentId
    if (!commentId) {
      return res.status(401).json({
        success: false,
        message: `CommentId is required`
      })
    }
    const comment = await CommentModel.findOneAndDelete({ _id: commentId })
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: `Comment Not found`
      })
    }
    return res.status(200).send({
      success: true,
      message: `Deleted the comment`,
      data: comment
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Internal Server Error : ${error}`
    })
  }
})

// POST
app.post("/create-comment", async (req, res) => {                           // future: needs authentication
  const { postId, parentId, userId, message } = req.body;                   // caution: delete the comment field after one time click, or duplicate comment will be created

  try {
    if (!postId || !parentId || !userId || !message) {
      return res.status(401).json({
        error: 'Missing required fields'
      });
    }

    const comment = new CommentModel({
      postId: postId,
      parentId: parentId,
      userId: userId,
      message: message
    });

    const savedComment = await comment.save();
    if (savedComment) {
      res.status(201).json({
        success:true,
        message: 'Comment created successfully',
        comment: savedComment
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: 'Internal Server Error'
    });
  }
});
app.post("/update-comment", async (req, res) => {
  try {
    const { commentId, newMessage, newLike, newChild } = req.body;
    if (!commentId) {
      res.status(401).json({
        success: false,
        error: `No commentId found`
      })
    }
    const updateFields = {};
    if (!newMessage && !newLike && !newChild) {
      res.status(401).json({
        success: false,
        error: `Nothing passed to update`
      })
    }
    if (newMessage) {
      updateFields.message = newMessage;
    }
    if (newLike) {
      updateFields.$push = { likes: newLike };                      // set not supported in mongodb, how to insert unique values only? O(N) takes for linear searcg(O(logn) by indexing the likes, but feels awkward to index)
    }
    if (newChild) {
      updateFields.$push = { children: newChild };
    }

    const updatedComment = await CommentModel.findOneAndUpdate(
      { _id: commentId },
      updateFields,
      { new: true }
    );

    if (updatedComment) {
      res.status(200).json({ success: true, message: 'Comment updated successfully.', updatedComment });
    } else {
      res.status(404).json({ success: false, message: 'Comment not found or not updated.' });
    }
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});
app.post("/create-like", async (req, res) => {
  try {
    console.log(`Like initiated`);
    const { userId, commentId, postId } = req.body;

    if (!userId || (commentId && postId) || (!commentId && !postId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid request. Provide either commentId or postId, but not both. Also, at least one of them is required."
      });
    }
    let existingLike;

    if (commentId) {
      // Check for existing like with userId and commentId
      existingLike = await LikeModel.findOne({ userId, commentId });
    } else if (postId) {
      // Check for existing like with userId and postId
      existingLike = await LikeModel.findOne({ userId, postId });
    }
    
    if (existingLike) {
      return res.status(400).json({
        success: false,
        error: `Like with UserId: ${userId}, ${commentId ? 'CommentId' : 'PostId'}: ${commentId || postId || 0} already exists`
      });
    }

    const newLike = new LikeModel({
      commentId: commentId || '0',
      postId: postId || '0',
      userId: userId
    });

    const savedLike = await newLike.save();
    if (savedLike) {
      res.status(201).json({
        success: true,
        message: 'Like created successfully',
        like: savedLike
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Error: ${error}`
    });
  }
});

const port = process.env.PORT || 3010

app.listen(port, () => {
  console.log("Server started listening on localhost:3010")
})