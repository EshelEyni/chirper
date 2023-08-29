import { APIFeatures } from "../../../../services/util/util.service";
import { UserModel } from "../../models/user/user.model";
import userService from "./user.service";
import followerService from "../user-relation/user-relation.service";

jest.mock("../../../../services/util/util.service");
jest.mock("../../models/user/user.model");
jest.mock("../follower/follower.service");

describe("User Service", () => {
  const mockToObject = jest.fn().mockReturnThis();
  function getMockedUser(id: number) {
    return {
      _id: id.toString(),
      username: "test1",
      email: "email@email.com",
      fullname: "fullname1",
      imgUrl: "imgUrl1",
      isApprovedLocation: true,
      active: true,
      toObject: mockToObject,
    };
  }

  describe("query", () => {
    const mockUsers = Array(3)
      .fill(null)
      .map((_, i) => getMockedUser(i + 1));

    const mockQueryObj = {
      filter: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limitFields: jest.fn().mockReturnThis(),
      paginate: jest.fn().mockReturnThis(),
      getQuery: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(mockUsers),
    };

    const mockAPIFeatures = jest.fn().mockImplementation(() => mockQueryObj);
    (APIFeatures as jest.Mock).mockImplementation(mockAPIFeatures);

    afterEach(() => {
      jest.clearAllMocks();
    });

    it("should return users", async () => {
      (followerService.getIsFollowing as jest.Mock).mockResolvedValue({});

      // Act
      const result = await userService.query({});

      // Assert
      expect(result).toEqual(mockUsers);
      expect(mockAPIFeatures).toHaveBeenCalledWith(UserModel.find(), {});
      expect(mockQueryObj.filter).toHaveBeenCalled();
      expect(mockQueryObj.sort).toHaveBeenCalled();
      expect(mockQueryObj.limitFields).toHaveBeenCalled();
      expect(mockQueryObj.paginate).toHaveBeenCalled();
      expect(mockQueryObj.getQuery).toHaveBeenCalled();
      expect(mockQueryObj.exec).toHaveBeenCalled();
    });
  });
});

/*
Notes: 

this function are not tested, because they only use Mongoose methods:
- getById
- getByUsername
- add
- update (filterObj is tested in util.service.test.ts)
- remove


*/
