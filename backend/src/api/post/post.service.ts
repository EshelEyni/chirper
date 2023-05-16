import { NewPost, Post, pollOption } from "../../../../shared/interfaces/post.interface";
import { QueryString } from "../../services/util.service.js";
import { IPost, PostModel } from "./post.model";
import { PollResultModel } from "./poll.model";
import { APIFeatures } from "../../services/util.service";
import { asyncLocalStorage } from "../../services/als.service";
import { alStoreType } from "../../middlewares/setupAls.middleware";
import mongoose from "mongoose";
import { AppError } from "../../services/error.service";

async function query(queryString: QueryString): Promise<IPost[]> {
  const features = new APIFeatures(PostModel.find(), queryString)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const posts = (await features.getQuery().populate(_populateUser()).exec()) as unknown as IPost[];

  if (posts.length > 0) {
    await _populateUserPollVotes(...posts);
  }

  return posts as unknown as IPost[];
}

async function getById(postId: string): Promise<IPost | null> {
  const post = await PostModel.findById(postId).populate(_populateUser()).exec();

  await _populateUserPollVotes(post as unknown as IPost);

  return post as unknown as IPost;
}

async function add(post: NewPost): Promise<Post> {
  const savedPost = await new PostModel(post).save();
  const populatedPost = await PostModel.findById(savedPost.id)
    .populate({
      path: "user",
      select: "_id username fullname imgUrl",
    })
    .exec();

  return populatedPost as unknown as Post;
}

async function update(id: string, post: Post): Promise<Post> {
  const updatedPost = await PostModel.findByIdAndUpdate(id, post, {
    new: true,
    runValidators: true,
  });

  return updatedPost as unknown as Post;
}

async function remove(postId: string): Promise<Post> {
  const removedPost = await PostModel.findByIdAndRemove(postId);
  return removedPost as unknown as Post;
}

async function setPollVote(postId: string, optionIdx: number, userId: string): Promise<pollOption> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const post = await PostModel.findById(postId).session(session);
    if (!post) throw new AppError("post not found", 404);
    const { poll } = post;
    if (!poll) throw new AppError("post has no poll", 400);

    const option = poll.options[optionIdx];
    if (!option) throw new AppError("option not found", 404);
    option.voteSum++;
    await post.save({ session });

    const vote = {
      postId,
      optionIdx,
      userId,
    };

    await PollResultModel.create([vote], { session });

    await session.commitTransaction();

    const { text, voteSum } = option;
    return { text, voteSum, isLoggedinUserVoted: true };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

async function _populateUserPollVotes(...posts: IPost[]) {
  const store = asyncLocalStorage.getStore() as alStoreType;
  const userId = store?.loggedinUserId;
  if (!userId) return;

  const pollResults = await PollResultModel.find({
    userId: new mongoose.Types.ObjectId(userId),
    postId: { $in: posts.map(post => post._id) },
  }).exec();

  if (!pollResults.length) return;

  const pollResultsMap = new Map(pollResults.map(result => [result.postId.toString(), result]));

  for (const post of posts) {
    if (post.poll) {
      const pollResult = pollResultsMap.get(post._id.toString());
      if (pollResult) post.poll.options[pollResult.optionIdx].isLoggedinUserVoted = true;
    }
  }
}

function _populateUser(): mongoose.PopulateOptions {
  return {
    path: "user",
    select: "_id username fullname imgUrl",
  };
}

export default {
  query,
  getById,
  add,
  update,
  remove,
  setPollVote,
};
