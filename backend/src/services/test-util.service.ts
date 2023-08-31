require("dotenv").config();
import mongoose from "mongoose";
import { LoggedInUserActionState, Poll, Post } from "../../../shared/interfaces/post.interface";
import { User, UserCredenitials } from "../../../shared/interfaces/user.interface";
import { UserModel } from "../api/user/models/user/user.model";
import { AppError } from "./error/error.service";
import tokenService from "./token/token.service";
import { Gif, GifCategory } from "../../../shared/interfaces/gif.interface";
import { BotPrompt } from "../../../shared/interfaces/bot.interface";
import ansiColors from "ansi-colors";
import { PostModel } from "../api/post/models/post/post.model";

type CreateTestUserOptions = {
  id?: string;
  isAdmin?: boolean;
  isBot?: boolean;
};

type CreateTestPostOptions = {
  id?: string;
  createdById?: string;
};

async function connectToTestDB({ isRemoteDB = false } = {}) {
  const { DB_URL, TEST_DB_NAME, LOCAL_DB_URL } = process.env;
  if (!LOCAL_DB_URL) throw new AppError("LOCAL_DB_URL is not defined.", 500);
  if (!DB_URL) throw new AppError("DB_URL is not defined.", 500);
  if (!TEST_DB_NAME) throw new AppError("TEST_DB_NAME is not defined.", 500);

  if (isRemoteDB) await mongoose.connect(DB_URL, { dbName: TEST_DB_NAME });
  else await mongoose.connect(LOCAL_DB_URL);

  // eslint-disable-next-line no-console
  console.log(ansiColors.bgGreen("Connected to DB"));
}

async function disconnectFromTestDB() {
  await mongoose.connection.close();
  // eslint-disable-next-line no-console
  console.log(ansiColors.bgRed("Disconnected from DB"));
}

function assertUser(user: User) {
  expect(user).toEqual(
    expect.objectContaining({
      id: expect.any(String),
      username: expect.any(String),
      fullname: expect.any(String),
      email: expect.any(String),
      bio: expect.any(String),
      imgUrl: expect.any(String),
      isAdmin: expect.any(Boolean),
      isVerified: expect.any(Boolean),
      isApprovedLocation: expect.any(Boolean),
      followingCount: expect.any(Number),
      followersCount: expect.any(Number),
      isFollowing: expect.any(Boolean),
      createdAt: expect.any(String),
    })
  );
}

function assertPost(post: Post) {
  expect(post).toEqual(
    expect.objectContaining({
      id: expect.any(String),
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      repliesCount: expect.any(Number),
      repostsCount: expect.any(Number),
      likesCount: expect.any(Number),
      viewsCount: expect.any(Number),
    })
  );

  assertLoggedInUserState(post.loggedInUserActionState);
  assertMiniUser(post.createdBy);
}

function assertLoggedInUserState(loggedInUserState: LoggedInUserActionState) {
  expect(loggedInUserState).toEqual({
    isLiked: expect.any(Boolean),
    isReposted: expect.any(Boolean),
    isViewed: expect.any(Boolean),
    isDetailedViewed: expect.any(Boolean),
    isProfileViewed: expect.any(Boolean),
    isHashTagClicked: expect.any(Boolean),
    isLinkClicked: expect.any(Boolean),
    isBookmarked: expect.any(Boolean),
    isPostLinkCopied: expect.any(Boolean),
    isPostShared: expect.any(Boolean),
    isPostSendInMessage: expect.any(Boolean),
    isPostBookmarked: expect.any(Boolean),
  });
}

function assertMiniUser(User: User) {
  expect(User).toEqual(
    expect.objectContaining({
      id: expect.any(String),
      username: expect.any(String),
      fullname: expect.any(String),
      imgUrl: expect.any(String),
      bio: expect.any(String),
      followersCount: expect.any(Number),
      followingCount: expect.any(Number),
      isFollowing: expect.any(Boolean),
    })
  );
}

function assertGifCategory(category: GifCategory) {
  expect(category).toEqual(
    expect.objectContaining({
      id: expect.any(String),
      name: expect.any(String),
      imgUrl: expect.any(String),
      sortOrder: expect.any(Number),
    })
  );
}

function assertGif(gif: Gif) {
  expect(gif).toEqual(
    expect.objectContaining({
      id: expect.any(String),
      url: expect.any(String),
      staticUrl: expect.any(String),
      description: expect.any(String),
      size: expect.objectContaining({
        height: expect.any(Number),
        width: expect.any(Number),
      }),
      placeholderUrl: expect.any(String),
      staticPlaceholderUrl: expect.any(String),
    })
  );
}

function assertPoll(poll: Poll) {
  expect(poll).toEqual(
    expect.objectContaining({
      options: expect.any(Array),
      isVotingOff: expect.any(Boolean),
      createdAt: expect.anything(),
    })
  );

  for (const option of poll.options) {
    expect(option).toEqual(
      expect.objectContaining({
        text: expect.any(String),
        voteCount: expect.any(Number),
        isLoggedInUserVoted: expect.any(Boolean),
      })
    );
  }

  expect(poll.options.length).toBeGreaterThanOrEqual(2);
  expect(poll.options.length).toBeLessThanOrEqual(5);

  const timeStamp = new Date(poll.createdAt).getTime();
  expect(timeStamp).toBeLessThanOrEqual(Date.now());

  expect(poll.length).toEqual({
    days: expect.any(Number),
    hours: expect.any(Number),
    minutes: expect.any(Number),
  });
}

function assertPostImgs(...postImgs: any) {
  for (const postImg of postImgs) {
    expect(postImg).toEqual(
      expect.objectContaining({
        url: expect.any(String),
        sortOrder: expect.any(Number),
      })
    );
  }
}

function assertBotPrompt(botPrompt: BotPrompt) {
  expect(botPrompt).toEqual(
    expect.objectContaining({
      botId: expect.any(String),
      prompt: expect.any(String),
      type: expect.any(String),
    })
  );
}

function createValidUserCreds(id?: string): UserCredenitials {
  const ranNum = Math.floor(Math.random() * 100000);
  const username = "testUser_" + ranNum;
  const password = "password";
  return {
    _id: id || getMongoId(),
    username: username,
    fullname: "Test User",
    email: `${username}@testemail.com`,
    password,
    passwordConfirm: password,
  } as UserCredenitials;
}

async function createTestUser({
  id,
  isAdmin = false,
  isBot = false,
}: CreateTestUserOptions): Promise<User> {
  const validId = id || getMongoId();
  await UserModel.findByIdAndDelete(validId).setOptions({ active: false });
  const user = createValidUserCreds(validId) as User;
  if (isAdmin) user.isAdmin = true;
  if (isBot) user.isBot = true;
  return (await UserModel.create(user)).toObject() as unknown as User;
}

async function deleteTestUser(id: string) {
  await UserModel.findByIdAndDelete(id).setOptions({ active: false });
}

function getLoginTokenStrForTest(validUserId: string) {
  const token = tokenService.signToken(validUserId);
  return `loginToken=${token}`;
}

function getMongoId() {
  return new mongoose.Types.ObjectId().toHexString();
}

function getMockedUser({
  id,
  isBot = false,
}: {
  id?: string | mongoose.Types.ObjectId;
  isBot?: boolean;
} = {}) {
  return {
    _id: id?.toString() || getMongoId(),
    username: "test1",
    email: "email@email.com",
    fullname: "fullname1",
    imgUrl: "imgUrl1",
    isApprovedLocation: true,
    active: true,
    isBot,
    toObject: jest.fn().mockReturnThis(),
  };
}

async function createTestPost({ id, createdById }: CreateTestPostOptions = {}): Promise<Post> {
  await PostModel.findByIdAndDelete(id);
  return await PostModel.create({
    _id: id || getMongoId(),
    createdById: createdById || (await createTestUser({})).id,
    text: "test post",
  });
}

async function deleteTestPost(id: string) {
  await PostModel.findByIdAndDelete(id);
}

function getMockPost() {
  return {
    _id: getMongoId(),
    createdById: getMongoId(),
    text: "test post",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function getMockPromptText(): string {
  const randomNum = Math.floor(Math.random() * 100000);
  return `test prompt #${randomNum}`;
}

export {
  connectToTestDB,
  disconnectFromTestDB,
  assertUser,
  assertPost,
  getLoginTokenStrForTest,
  assertGifCategory,
  assertGif,
  assertPoll,
  assertPostImgs,
  assertBotPrompt,
  assertLoggedInUserState,
  createTestUser,
  createValidUserCreds,
  createTestPost,
  getMongoId,
  getMockedUser,
  getMockPost,
  getMockPromptText,
  deleteTestUser,
  deleteTestPost,
};
