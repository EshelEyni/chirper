import mongoose from "mongoose";
import { BlockModel, FollowerModel, MuteModel, UserRelationModel } from "./user-relation.model";
import { UserModel } from "../user/user.model";
import {
  connectToTestDB,
  createTestUser,
  deleteTestUser,
  getMongoId,
} from "../../../../services/test-util.service";
import { User } from "../../../../../../shared/interfaces/user.interface";

describe("User Relation Model", () => {
  // Assuming that users are required for testing
  let fromUser: User, toUser: User;

  beforeAll(async () => {
    await connectToTestDB();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    fromUser = await createTestUser({ id: getMongoId() });
    toUser = await createTestUser({ id: getMongoId() });
  });

  afterEach(async () => {
    await UserRelationModel.deleteMany({});
    await UserModel.deleteMany({ _id: { $in: [fromUser.id, toUser.id] } });
  });

  describe("UserRelation Schema", () => {
    it("should create a userRelation document", async () => {
      const userRelation = new UserRelationModel({
        fromUserId: fromUser.id,
        toUserId: toUser.id,
      });
      const savedUserRelation = await userRelation.save();
      expect(savedUserRelation).toBeDefined();
      expect(savedUserRelation.fromUserId.toString()).toEqual(fromUser.id.toString());
      expect(savedUserRelation.toUserId.toString()).toEqual(toUser.id.toString());
    });

    it("should not allow the same user to target themselves", async () => {
      const follower = new UserRelationModel({
        fromUserId: fromUser.id,
        toUserId: fromUser.id,
      });
      let error;
      try {
        await follower.save();
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error.errors.toUserId.message).toBe("You can't target yourself");
    });

    it("should throw an error if user not found", async () => {
      const id = getMongoId();
      await deleteTestUser(id);

      const follower = new UserRelationModel({
        fromUserId: id,
        toUserId: toUser.id,
      });

      let error;
      try {
        await follower.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.message).toBe("UserRelation validation failed: fromUserId: User not found");
    });

    it("should throw an error if target user not found", async () => {
      const id = getMongoId();
      await deleteTestUser(id);
      const follower = new UserRelationModel({
        fromUserId: fromUser.id,
        toUserId: id,
      });

      let error;

      try {
        await follower.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.message).toBe("UserRelation validation failed: toUserId: Target User not found");
    });

    it("should not allow duplicate userRelations", async () => {
      const followerData = {
        fromUserId: fromUser.id,
        toUserId: toUser.id,
      };
      await UserRelationModel.create(followerData);

      const follower = new UserRelationModel(followerData);
      let error;
      try {
        await follower.save();
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error.message).toContain("duplicate key error");
    });
  });

  describe("UserRelationModel", () => {
    it("should create a follower document", async () => {
      const follower = await FollowerModel.create({
        fromUserId: fromUser.id,
        toUserId: toUser.id,
      });

      expect(follower).toBeDefined();
      expect(follower.fromUserId.toString()).toEqual(fromUser.id.toString());
      expect(follower.toUserId.toString()).toEqual(toUser.id.toString());
      expect(follower.kind).toBe("Follower");
    });

    it("should create a Mute document", async () => {
      const mute = await MuteModel.create({
        fromUserId: fromUser.id,
        toUserId: toUser.id,
      });

      expect(mute).toBeDefined();
      expect(mute.fromUserId.toString()).toEqual(fromUser.id.toString());
      expect(mute.toUserId.toString()).toEqual(toUser.id.toString());
      expect(mute.kind).toBe("Mute");
    });

    it("should create a Block document", async () => {
      const block = await BlockModel.create({
        fromUserId: fromUser.id,
        toUserId: toUser.id,
      });

      expect(block).toBeDefined();
      expect(block.fromUserId.toString()).toEqual(fromUser.id.toString());
      expect(block.toUserId.toString()).toEqual(toUser.id.toString());
      expect(block.kind).toBe("Block");
    });
  });
});
