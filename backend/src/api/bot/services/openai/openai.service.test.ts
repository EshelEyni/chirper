import { assertPoll, assertPostImgs } from "../../../../services/test-util.service";
import openAIService from "./openai.service";
import { Configuration, OpenAIApi } from "openai";
import axios from "axios";
import { v2 as cloudinary } from "cloudinary";

jest.mock("openai", () => {
  const mockOpenAIConfiguration = {
    organization: process.env.OPEN_AI_ORGANIZATION,
    apiKey: process.env.OPENAI_API_KEY,
  };
  const mockOpenAIApi = {
    createChatCompletion: jest.fn(),
    createCompletion: jest.fn(),
    createImage: jest.fn(),
  };

  return {
    Configuration: jest.fn().mockImplementation(() => mockOpenAIConfiguration),
    OpenAIApi: jest.fn().mockImplementation(() => mockOpenAIApi),
  };
});

jest.mock("cloudinary", () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload_stream: jest.fn(),
    },
  },
}));

jest.mock("axios");

const _uploadToCloudinary = jest.fn();

describe("Open AI Service", () => {
  const configuration = new Configuration({
    organization: process.env.OPEN_AI_ORGANIZATION,
    apiKey: process.env.OPENAI_API_KEY,
  });

  const openai = new OpenAIApi(configuration);

  describe("getTextFromOpenAI", () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    it("should return text from OpenAI using gpt-4 model", async () => {
      const prompt = "Sample prompt";
      const response = {
        data: {
          choices: [{ message: { content: "Sample response from gpt-4" } }],
        },
      };

      openai.createChatCompletion = jest.fn().mockResolvedValue(response);

      const result = await openAIService.getTextFromOpenAI(prompt, "gpt-4");
      expect(openai.createChatCompletion).toHaveBeenCalledWith({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
      });
      expect(result).toEqual("Sample response from gpt-4");
    });

    it("should return text from OpenAI using default model", async () => {
      const prompt = "Sample prompt";
      const response = {
        data: {
          choices: [{ text: "Sample response from default model" }],
        },
      };

      openai.createCompletion = jest.fn().mockResolvedValue(response);

      const result = await openAIService.getTextFromOpenAI(prompt);
      expect(openai.createCompletion).toHaveBeenCalledWith({
        model: "text-davinci-003",
        prompt,
        max_tokens: 4000,
      });
      expect(result).toEqual("Sample response from default model");
    });

    it("should throw an error if message is undefined for gpt-4 model", async () => {
      const prompt = "Sample prompt";
      const response = {
        data: {
          choices: [{ message: undefined }],
        },
      };

      openai.createChatCompletion = jest.fn().mockResolvedValue(response);

      await expect(openAIService.getTextFromOpenAI(prompt, "gpt-4")).rejects.toThrow(
        "message is undefined"
      );
    });

    it("should throw an error if message is undefined for default model", async () => {
      const prompt = "Sample prompt";
      const response = {
        data: {
          choices: [{ text: undefined }],
        },
      };

      openai.createCompletion = jest.fn().mockResolvedValue(response);

      await expect(openAIService.getTextFromOpenAI(prompt)).rejects.toThrow("text is undefined");
    });
  });

  describe("getAndSetPostPollFromOpenAI function", () => {
    const getResponse = (choices: any) => ({ data: { choices } });

    beforeEach(() => {
      jest.resetAllMocks();
    });

    it("should return text and poll for valid input", async () => {
      const prompt = "Sample prompt";
      const choices = [
        {
          message: {
            content: JSON.stringify({
              question: "Sample question",
              options: ["option1", "option2"],
            }),
          },
        },
      ];
      const response = getResponse(choices);
      openai.createChatCompletion = jest.fn().mockResolvedValue(response);

      const result = await openAIService.getAndSetPostPollFromOpenAI(prompt);
      expect(result.text).toEqual("Sample question");
      assertPoll(result.poll);
    });

    it("should throw an error if message is undefined", async () => {
      const prompt = "Sample prompt";
      const choices = [{}];
      const response = getResponse(choices);

      openai.createChatCompletion = jest.fn().mockResolvedValue(response);
      await expect(openAIService.getAndSetPostPollFromOpenAI(prompt)).rejects.toThrow(
        "message is undefined"
      );
    });

    it("should throw an error if options are missing", async () => {
      const prompt = "Sample prompt";
      const choices = [{ message: { content: JSON.stringify({ question: "Sample question" }) } }];
      const response = getResponse(choices);
      openai.createChatCompletion = jest.fn().mockResolvedValue(response);

      await expect(openAIService.getAndSetPostPollFromOpenAI(prompt)).rejects.toThrow(
        "question or options is undefined"
      );
    });

    it("should throw an error if options are not an array", async () => {
      const prompt = "Sample prompt";
      const choices = [
        {
          message: {
            content: JSON.stringify({ question: "Sample question", options: "not an array" }),
          },
        },
      ];

      const response = getResponse(choices);
      openai.createChatCompletion = jest.fn().mockResolvedValue(response);

      await expect(openAIService.getAndSetPostPollFromOpenAI(prompt)).rejects.toThrow();
    });

    it("should throw an error if question is missing", async () => {
      const prompt = "Sample prompt";
      const choices = [
        { message: { content: JSON.stringify({ options: ["option1", "option2"] }) } },
      ];
      const response = getResponse(choices);
      openai.createChatCompletion = jest.fn().mockResolvedValue(response);

      await expect(openAIService.getAndSetPostPollFromOpenAI(prompt)).rejects.toThrow(
        "question or options is undefined"
      );
    });

    it("should throw an error if option is not a string", async () => {
      const prompt = "Sample prompt";
      const choices = [
        {
          message: {
            content: JSON.stringify({ question: "Sample question", options: ["option1", 2] }),
          },
        },
      ];
      const response = getResponse(choices);

      openai.createChatCompletion = jest.fn().mockResolvedValue(response);

      await expect(openAIService.getAndSetPostPollFromOpenAI(prompt)).rejects.toThrow(
        "option is not a string"
      );
    });

    it("should throw an error if options are less than 2", async () => {
      const prompt = "Sample prompt";
      const choices = [
        {
          message: {
            content: JSON.stringify({ question: "Sample question", options: ["option1"] }),
          },
        },
      ];
      const response = getResponse(choices);

      openai.createChatCompletion = jest.fn().mockResolvedValue(response);

      await expect(openAIService.getAndSetPostPollFromOpenAI(prompt)).rejects.toThrow(
        "options must be at least 2"
      );
    });

    it("should throw an error for invalid JSON in message content", async () => {
      const prompt = "Sample prompt";
      const choices = [{ message: { content: "Invalid JSON" } }];
      const response = getResponse(choices);

      openai.createChatCompletion = jest.fn().mockResolvedValue(response);

      await expect(openAIService.getAndSetPostPollFromOpenAI(prompt)).rejects.toThrow(
        "Unexpected token I in JSON at position 0"
      );
    });

    it("should throw an error if an option is an empty string", async () => {
      const prompt = "Sample prompt";
      const choices = [
        {
          message: {
            content: JSON.stringify({ question: "Sample question", options: ["option1", ""] }),
          },
        },
      ];
      const response = getResponse(choices);
      openai.createChatCompletion = jest.fn().mockResolvedValue(response);

      await expect(openAIService.getAndSetPostPollFromOpenAI(prompt)).rejects.toThrow(
        "option is undefined"
      );
    });
  });

  fdescribe("getImgsFromOpenOpenAI", () => {
    function mockOpenAICreateImg(...dataUrls: string[]) {
      openai.createImage = jest.fn().mockResolvedValueOnce({
        data: {
          data: dataUrls.map(url => ({ url })),
        },
      });
    }

    function mockCloudinaryUpload(...cloudinaryUrls: string[]) {
      (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation((options, callback) => {
        const fakeStream = {
          end: () => {
            callback(null, { url: cloudinaryUrls[0] });
          },
        };
        return fakeStream;
      });
    }

    function getUrls(num: number) {
      const dataUrls = [];
      const cloudinaryUrls = [];
      for (let i = 0; i < num; i++) {
        dataUrls.push(`http://img${i}.url`);
        cloudinaryUrls.push(`http://cloudinary/img${i}.url`);
      }
      return { dataUrls, cloudinaryUrls };
    }

    beforeEach(() => {
      jest.resetAllMocks();

      axios.get = jest.fn().mockResolvedValueOnce({
        data: "Sample image data",
      });
    });

    it("should return a single image URL", async () => {
      const prompt = "Sample prompt";
      const numberOfImages = 1;
      const { dataUrls, cloudinaryUrls } = getUrls(numberOfImages);
      mockOpenAICreateImg(...dataUrls);
      mockCloudinaryUpload(...cloudinaryUrls);

      const result = await openAIService.getImgsFromOpenOpenAI(prompt, numberOfImages);
      assertPostImgs(...result);
    });

    // it("should return multiple image URLs", async () => {
    //   // Similar to the above, but mock multiple images in response
    // });

    // it("should throw an error if data.url is undefined", async () => {
    //   openai.createImage.mockResolvedValue({
    //     data: {
    //       data: [{ url: undefined }],
    //     },
    //   });

    //   await expect(getImgsFromOpenOpenAI("Sample prompt")).rejects.toThrow("data.url is undefined");
    // });

    // it("should handle failed image download", async () => {
    //   openai.createImage.mockResolvedValue({
    //     /* ... */
    //   });
    //   axios.get.mockRejectedValue(new Error("Failed to download"));

    //   await expect(getImgsFromOpenOpenAI("Sample prompt")).rejects.toThrow("Failed to download");
    // });

    // it("should handle failed upload to Cloudinary", async () => {
    //   openai.createImage.mockResolvedValue({
    //     /* ... */
    //   });
    //   axios.get.mockResolvedValue({
    //     /* ... */
    //   });
    //   _uploadToCloudinary.mockRejectedValue(new Error("Failed to upload"));

    //   await expect(getImgsFromOpenOpenAI("Sample prompt")).rejects.toThrow("Failed to upload");
    // });
  });
});
