import { Request, Response } from "express";
import { validateIds } from "../../Services/Util/UtilService";
import {
  NewPost,
  Post,
  PostRepostResult,
  PostStats,
} from "../../../../shared/types/post.interface";
import postService from "../../Services/Post/PostService";
import {
  asyncErrorCatcher,
  AppError,
  validatePatchRequestBody,
} from "../../Services/Error/ErrorService";
import { getLoggedInUserIdFromReq } from "../../Services/ALSService";
import postStatsService from "../../Services/PostStats/PostStatsService";
import { deleteOne, getAll } from "../../Services/Factory/FactoryService";
import { PostModel } from "../../Models/Post/PostModel";
import { PromotionalPostModel } from "../../Models/PromotionalPost/PromotionalPostModel";
import { PostBookmarkModel, IBookmarkedPostDoc } from "../../Models/PostBookmark/PostBookmarkModel";
import { PostLikeModel } from "../../Models/PostLike/PostLikeModel";
import { RepostModel } from "../../Models/Repost/RepostModel";
import { PostStatsModel } from "../../Models/PostStats/PostStatsModel";
import { PollVoteModel } from "../../Models/PollVote/PollVoteModel";
import { IRepostDoc } from "../../Types/ITypes";
import { ParsedReqQuery } from "../../Types/App";

const getPosts = asyncErrorCatcher(async (req: Request, res: Response): Promise<void> => {
  const queryString = req.query as ParsedReqQuery;
  const posts = (await postService.query(queryString)) as unknown as Post[];

  res.send({
    status: "success",
    requestedAt: new Date().toISOString(),
    results: posts.length,
    data: posts,
  });
});

const getPostById = asyncErrorCatcher(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  validateIds({ id, entityName: "post" });
  const post = await PostModel.findById(id);
  if (!post) throw new AppError(`Post with id ${id} not found`, 404);

  res.send({
    status: "success",
    data: post,
  });
});

const addPost = asyncErrorCatcher(async (req: Request, res: Response): Promise<void> => {
  const post = req.body as unknown as Partial<NewPost>;
  const loggedInUserId = getLoggedInUserIdFromReq();
  validateIds({ id: loggedInUserId, entityName: "loggedInUser" });
  post.createdById = loggedInUserId;
  const savedPost = await PostModel.create(post);

  res.status(201).send({
    status: "success",
    data: savedPost,
  });
});

const addPostThread = asyncErrorCatcher(async (req: Request, res: Response): Promise<void> => {
  const posts = req.body as unknown as NewPost[];

  const loggedInUserId = getLoggedInUserIdFromReq();
  validateIds({ id: loggedInUserId, entityName: "loggedInUser" });
  posts.forEach(post => {
    post.createdById = loggedInUserId;
  });

  const result = await PostModel.insertMany(posts, { ordered: true, rawResult: true });
  const postId = result.insertedIds[0];
  const post = await PostModel.findById(postId);

  res.status(201).send({
    status: "success",
    data: post,
  });
});

const addReply = asyncErrorCatcher(async (req: Request, res: Response): Promise<void> => {
  const loggedInUserId = getLoggedInUserIdFromReq();
  const postId = req.params.id;

  validateIds(
    { id: postId, entityName: "post" },
    { id: loggedInUserId, entityName: "loggedInUser" }
  );

  const reply = req.body as unknown as NewPost;
  reply.createdById = loggedInUserId;
  reply.parentPostId = postId;
  const savedReply = await PostModel.create(reply);
  const post = await PostModel.findById(postId);

  res.status(201).send({
    status: "success",
    data: {
      post,
      reply: savedReply,
    },
  });
});

const quotePost = asyncErrorCatcher(async (req: Request, res: Response): Promise<void> => {
  const loggedInUserId = getLoggedInUserIdFromReq();
  const quotedPostId = req.params.id;

  validateIds(
    { id: loggedInUserId, entityName: "loggedInUser" },
    { id: quotedPostId, entityName: "quoted post" }
  );

  const post = req.body as unknown as NewPost;
  post.quotedPostId = quotedPostId;
  post.createdById = loggedInUserId;

  let data: Post | PostRepostResult;
  const isRepost = !post.text && !post.imgs?.length && !post.gif && !post.video;
  if (isRepost) {
    data = await RepostModel.create({
      postId: quotedPostId,
      userId: loggedInUserId,
    });
  } else {
    data = (await PostModel.create(post)) as unknown as Post;
  }

  res.status(201).send({
    status: "success",
    data,
  });
});

const updatePost = asyncErrorCatcher(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const loggedInUserId = getLoggedInUserIdFromReq();

  validateIds({ id, entityName: "post" }, { id: loggedInUserId, entityName: "loggedInUser" });

  const postToUpdate = req.body;
  validatePatchRequestBody(postToUpdate);

  const updatedPost = await PostModel.findOneAndUpdate(
    {
      _id: id,
      createdById: loggedInUserId,
    },
    postToUpdate,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!updatedPost) throw new AppError(`Post with id ${id} not found`, 404);
  res.send({
    status: "success",
    data: updatedPost,
  });
});

const removePost = deleteOne(PostModel);

const addRepost = asyncErrorCatcher(async (req: Request, res: Response): Promise<void> => {
  const loggedInUserId = getLoggedInUserIdFromReq();
  const postId = req.params.id;

  validateIds(
    { id: postId, entityName: "post" },
    { id: loggedInUserId, entityName: "loggedInUser" }
  );

  // NOTE: RepostModel.create() returns a RepostDoc, and it is parsed by express
  // as a PostRepostResult, that's why we need to cast it to IRepostDoc for clarity and type safety
  // you can't access the repost property directly, because it is created by the toObject() || toJSON() methods

  const data = (await RepostModel.create({
    postId,
    userId: loggedInUserId,
  })) as unknown as IRepostDoc;

  res.status(201).send({
    status: "success",
    data,
  });
});

const removeRepost = asyncErrorCatcher(async (req: Request, res: Response): Promise<void> => {
  const loggedInUserId = getLoggedInUserIdFromReq();
  const postId = req.params.id;

  validateIds(
    { id: postId, entityName: "post" },
    { id: loggedInUserId, entityName: "loggedInUser" }
  );

  const result = (await RepostModel.findOneAndDelete({
    postId,
    userId: loggedInUserId,
  })) as unknown as IRepostDoc;

  res.send({
    status: "success",
    data: result?.post,
  });
});

const addPollVote = asyncErrorCatcher(async (req: Request, res: Response): Promise<void> => {
  const postId = req.params.id;
  const loggedInUserId = getLoggedInUserIdFromReq();
  const optionIdx = Number(req.body.optionIdx);

  validateIds(
    { id: postId, entityName: "post" },
    { id: loggedInUserId, entityName: "loggedInUser" }
  );

  if (isNaN(optionIdx)) throw new AppError("Invalid option index provided", 400);

  await PollVoteModel.create({
    postId,
    optionIdx,
    userId: loggedInUserId,
  });

  const post = await PostModel.findById(postId);
  if (!post) throw new AppError(`Post with id ${postId} not found`, 404);

  res.send({
    status: "success",
    data: post,
  });
});

const addLike = asyncErrorCatcher(async (req: Request, res: Response): Promise<void> => {
  const loggedInUserId = getLoggedInUserIdFromReq();
  const postId = req.params.id;

  validateIds(
    { id: postId, entityName: "post" },
    { id: loggedInUserId, entityName: "loggedInUser" }
  );

  const updatedPost = (
    await PostLikeModel.create({
      postId,
      userId: loggedInUserId,
    })
  ).post;

  res.status(201).send({
    status: "success",
    data: updatedPost,
  });
});

const removeLike = asyncErrorCatcher(async (req: Request, res: Response): Promise<void> => {
  const loggedInUserId = getLoggedInUserIdFromReq();
  const postId = req.params.id;

  validateIds(
    { id: postId, entityName: "post" },
    { id: loggedInUserId, entityName: "loggedInUser" }
  );

  const updatedPost = (
    await PostLikeModel.findOneAndDelete({
      postId,
      userId: loggedInUserId,
    })
  )?.post;

  if (!updatedPost) throw new AppError("Post is not liked", 404);

  res.send({
    status: "success",
    data: updatedPost,
  });
});

const getPostStats = asyncErrorCatcher(async (req: Request, res: Response): Promise<void> => {
  const postId = req.params.id;
  validateIds({ id: postId, entityName: "post" });

  const postStats = await postStatsService.get(postId);

  res.send({
    status: "success",
    data: postStats,
  });
});

const createPostStats = asyncErrorCatcher(async (req: Request, res: Response): Promise<void> => {
  const postId = req.params.id;
  const postStats: Partial<PostStats> = req.body;
  const loggedInUserId = getLoggedInUserIdFromReq();

  validateIds(
    { id: postId, entityName: "post" },
    { id: loggedInUserId, entityName: "loggedInUser" }
  );

  await PostStatsModel.create({
    postId,
    userId: loggedInUserId,
    ...postStats,
  });

  res.status(204).send({
    status: "success",
    data: null,
  });
});

const updatePostStats = asyncErrorCatcher(async (req: Request, res: Response): Promise<void> => {
  const postId = req.params.id;
  const loggedInUserId = getLoggedInUserIdFromReq();
  const stats = req.body;

  validateIds(
    { id: postId, entityName: "post" },
    { id: loggedInUserId, entityName: "loggedInUser" }
  );

  await PostStatsModel.findOneAndUpdate(
    {
      postId,
      userId: loggedInUserId,
    },
    stats
  );

  res.status(204).send({
    status: "success",
    data: null,
  });
});

const getBookmarkedPosts = asyncErrorCatcher(async (req: Request, res: Response): Promise<void> => {
  const loggedInUserId = getLoggedInUserIdFromReq();
  validateIds({ id: loggedInUserId, entityName: "loggedInUser" });

  const bookmarkedPosts = (
    await PostBookmarkModel.find({
      userId: loggedInUserId,
    })
  ).map((doc: IBookmarkedPostDoc) => doc.post);

  res.send({
    status: "success",
    requestedAt: new Date().toISOString(),
    results: bookmarkedPosts.length,
    data: bookmarkedPosts,
  });
});

const addBookmarkedPost = asyncErrorCatcher(async (req: Request, res: Response): Promise<void> => {
  const loggedInUserId = getLoggedInUserIdFromReq();
  const postId = req.params.id;

  validateIds(
    { id: postId, entityName: "post" },
    { id: loggedInUserId, entityName: "loggedInUser" }
  );

  const updatedPost = (
    await PostBookmarkModel.create({
      postId,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      userId: loggedInUserId!,
    })
  ).post;

  res.status(201).send({
    status: "success",
    data: updatedPost,
  });
});

const removeBookmarkedPost = asyncErrorCatcher(
  async (req: Request, res: Response): Promise<void> => {
    const loggedInUserId = getLoggedInUserIdFromReq();
    const postId = req.params.id;

    validateIds(
      { id: postId, entityName: "post" },
      { id: loggedInUserId, entityName: "loggedInUser" }
    );

    const updatedPost = (
      await PostBookmarkModel.findOneAndDelete({
        postId,
        userId: loggedInUserId,
      })
    )?.post;

    if (!updatedPost) throw new AppError("Post is not bookmarked", 404);

    res.send({
      status: "success",
      data: updatedPost,
    });
  }
);

const getPromotionalPosts = getAll(PromotionalPostModel);

const addPromotionalPost = asyncErrorCatcher(async (req: Request, res: Response): Promise<void> => {
  const loggedInUserId = getLoggedInUserIdFromReq();
  const post = req.body as unknown as NewPost;
  validateIds({ id: loggedInUserId, entityName: "loggedInUser" });
  post.createdById = loggedInUserId;
  const savedPost = await PromotionalPostModel.create(post);

  res.status(201).send({
    status: "success",
    data: savedPost,
  });
});

export {
  getPosts,
  getPostById,
  addPost,
  addPostThread,
  addReply,
  addRepost,
  quotePost,
  updatePost,
  removePost,
  removeRepost,
  addPollVote,
  addLike,
  removeLike,
  getPostStats,
  createPostStats,
  updatePostStats,
  getBookmarkedPosts,
  addBookmarkedPost,
  removeBookmarkedPost,
  getPromotionalPosts,
  addPromotionalPost,
};
