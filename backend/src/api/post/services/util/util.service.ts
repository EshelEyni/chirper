import { ObjectId } from "mongodb";
import { isValidMongoId } from "../../../../services/util/util.service";
import { RepostModel } from "../../models/repost.model";
import { PostLikeModel } from "../../models/post-like.model";
import { BookmarkedPostModel } from "../../models/bookmark-post.model";
import { PostStatsModel } from "../../models/post-stats.model";
import {
  LoggedInUserActionState,
  LoggedInUserActionStates,
  PostStatsBody,
} from "../../../../../../shared/interfaces/post.interface";
import { asyncLocalStorage } from "../../../../services/als.service";
import { alStoreType } from "../../../../middlewares/setupAls/setupAls.middleware";

export const loggedInUserActionDefaultState: LoggedInUserActionState = {
  isLiked: false,
  isReposted: false,
  isViewed: false,
  isDetailedViewed: false,
  isProfileViewed: false,
  isFollowedFromPost: false,
  isHashTagClicked: false,
  isLinkClicked: false,
  isBookmarked: false,
  isPostLinkCopied: false,
  isPostShared: false,
  isPostSendInMessage: false,
  isPostBookmarked: false,
};

async function getPostLoggedInUserActionState(...ids: string[]): Promise<LoggedInUserActionStates> {
  const store = asyncLocalStorage.getStore() as alStoreType;
  const loggedInUserId = store?.loggedInUserId;

  const uniquePostIds = Array.from(new Set(ids.map(id => new ObjectId(id))));

  if (!isValidMongoId(loggedInUserId)) {
    const defaultStates = ids.reduce(
      (acc, id) => ({ ...acc, [id]: loggedInUserActionDefaultState }),
      {}
    );
    return defaultStates;
  }

  const userId = new ObjectId(loggedInUserId);

  const repostResults = await RepostModel.find({
    postId: { $in: uniquePostIds },
    repostOwnerId: userId,
  })
    .select({ postId: 1 })
    .exec();

  const repostsIdSet = new Set(repostResults.map(repost => repost.postId.toString()));

  const likesResults = await PostLikeModel.find({
    postId: { $in: uniquePostIds },
    userId,
  });

  const likesIdSet = new Set(likesResults.map(like => like.postId.toString()));

  const bookmarkedResults = await BookmarkedPostModel.find({
    postId: { $in: uniquePostIds },
    bookmarkOwnerId: userId,
  });

  const bookmarkedIdSet = new Set(bookmarkedResults.map(bookmark => bookmark.postId.toString()));

  const postStatsResults = await PostStatsModel.find({
    postId: { $in: uniquePostIds },
    userId,
  });

  const postStatsMap = new Map(postStatsResults.map(result => [result.postId.toString(), result]));

  const state = ids.reduce((acc, id): LoggedInUserActionStates => {
    const postId = new ObjectId(id);
    const isReposted = repostsIdSet.has(postId.toString());
    const isLiked = likesIdSet.has(postId.toString());
    const isBookmarked = bookmarkedIdSet.has(postId.toString());
    const postStats = postStatsMap.get(postId.toString()) as unknown as PostStatsBody;
    const additionalState: Partial<LoggedInUserActionState> = postStats
      ? {
          isViewed: postStats.isViewed,
          isDetailedViewed: postStats.isDetailedViewed,
          isProfileViewed: postStats.isProfileViewed,
          isFollowedFromPost: postStats.isFollowedFromPost,
          isHashTagClicked: postStats.isHashTagClicked,
          isLinkClicked: postStats.isLinkClicked,
          isPostLinkCopied: postStats.isPostLinkCopied,
          isPostShared: postStats.isPostShared,
          isPostSendInMessage: postStats.isPostSendInMessage,
          isPostBookmarked: postStats.isPostBookmarked,
        }
      : {};
    return {
      ...acc,
      [id]: {
        ...loggedInUserActionDefaultState,
        isReposted,
        isLiked,
        isBookmarked,
        ...additionalState,
      },
    };
  }, {});

  return state;
}

function populateRepostedBy() {
  return {
    path: "repostedBy",
    select: {
      _id: 1,
      username: 1,
      fullname: 1,
      imgUrl: 1,
      isVerified: 1,
      isAdmin: 1,
      bio: 1,
      followersCount: 1,
      followingCount: 1,
    },
  };
}

export default { getPostLoggedInUserActionState, populateRepostedBy };

// Path: src\api\post\services\util\util.service.test.ts
