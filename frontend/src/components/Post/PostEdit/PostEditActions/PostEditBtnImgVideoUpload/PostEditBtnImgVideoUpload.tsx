import { FC, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch } from "../../../../../store/types";
import { RootState } from "../../../../../store/store";
import { updateCurrNewPost } from "../../../../../store/actions/new-post.actions";
import { readAsDataURL } from "../../../../../services/util/utils.service";
import { PostEditActionBtn } from "../PostEditActions/PostEditActions";
import { usePostEdit } from "../../../../../contexts/PostEditContext";
import { setUserMsg } from "../../../../../store/slices/systemSlice";

type PostEditBtnImgAndVideoUploadProps = {
  btn: PostEditActionBtn;
  isMultiple: boolean;
  isPickerShown: boolean;
};

export const PostEditBtnImgAndVideoUpload: FC<PostEditBtnImgAndVideoUploadProps> = ({
  btn,
  isMultiple,
  isPickerShown,
}) => {
  const dispatch: AppDispatch = useDispatch();
  const { loggedInUser } = useSelector((state: RootState) => state.auth);
  const { newPostType } = useSelector((state: RootState) => state.newPostModule);
  const { currNewPost } = usePostEdit();
  const fileRef = useRef<HTMLInputElement>(null);

  function onUploadFiles(e: React.ChangeEvent<HTMLInputElement>) {
    if (!currNewPost) return;
    const { files } = e.target;
    if (!files) return;
    const { isValid, type } = validateFiles([...files]);
    if (!isValid) return;
    if (type === "video") onUploadVideo([...files].at(0)!);
    else onUploadImgs([...files]);
    e.target.value = "";
  }

  function validateFiles(files: File[]): { isValid: boolean; type?: string } {
    const fileTypes = [...files].map(file => file.type.slice(0, 5));
    const isValidFileType = fileTypes.every(
      fileType => fileType === "image" || fileType === "video"
    );
    if (!isValidFileType) {
      dispatch(
        setUserMsg({
          type: "info",
          text: "Only images and videos are allowed.",
        })
      );
      return { isValid: false };
    }
    const isVideoType = fileTypes.some(fileType => fileType === "video");
    if (isVideoType) return validateVideoFile(files);
    else return validateImgFiles(files);
  }

  function validateVideoFile(files: File[]): { isValid: boolean; type?: string } {
    const isMoreThanOneVideoFile = files.length > 1;
    if (isMoreThanOneVideoFile) {
      dispatch(
        setUserMsg({
          type: "info",
          text: "Only one video is allowed.",
        })
      );
      return { isValid: false };
    }
    const videoFile = [...files].at(0)!;
    const isVideoGreaterThan10MB = videoFile.size > 10000000;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const { isVerified } = loggedInUser!;
    if (!isVerified && isVideoGreaterThan10MB) {
      dispatch(
        setUserMsg({
          type: "info",
          text: "Only verified users can upload videos larger than 10MB.",
        })
      );
      return { isValid: false };
    }
    return { isValid: true, type: "video" };
  }

  function validateImgFiles(files: File[]): { isValid: boolean; type?: string } {
    const isImagesGreaterThan4 = [...files].length + currNewPost!.imgs.length > 4;
    if (isImagesGreaterThan4) {
      dispatch(
        setUserMsg({
          type: "info",
          text: "Please choose either 1 GIF or up to 4 photos.",
        })
      );
      return { isValid: false };
    }
    return { isValid: true, type: "image" };
  }

  async function onUploadImgs(files: File[]) {
    if (!currNewPost) return;
    const newImgs = [...currNewPost.imgs];
    files.forEach(async file => {
      try {
        if (file) {
          const currIdx = newImgs.length;
          newImgs.push({ url: "", isLoading: true, file });
          dispatch(updateCurrNewPost({ ...currNewPost, imgs: [...newImgs] }, newPostType));
          const dataUrl = await readAsDataURL(file);
          newImgs[currIdx] = { url: dataUrl, isLoading: false, file };
          dispatch(updateCurrNewPost({ ...currNewPost, imgs: [...newImgs] }, newPostType));
        }
      } catch (error) {
        console.error("Error reading file:", error);
      }
    });
  }

  async function onUploadVideo(file: File) {
    if (!currNewPost) return;
    try {
      const newPostPreLoad = { ...currNewPost, video: { url: "", isLoading: true, file } };
      dispatch(updateCurrNewPost(newPostPreLoad, newPostType));
      const dataUrl = await readAsDataURL(file);
      const newPost = { ...currNewPost, video: { url: dataUrl, isLoading: false, file } };
      dispatch(updateCurrNewPost(newPost, newPostType));
    } catch (error) {
      console.error("Error reading file:", error);
    }
  }

  return (
    <button
      className={"post-edit-action-btn" + (btn.isDisabled ? " disabled" : "")}
      onClick={() => {
        if (fileRef.current && !btn.isDisabled && isPickerShown) fileRef.current.click();
      }}
    >
      <div className="post-edit-action-icon-container">{btn.icon}</div>
      <input
        type={btn.type}
        accept={"image/*,video/*"}
        multiple={isMultiple}
        disabled={currNewPost?.imgs.length === 4 || !isPickerShown}
        id={btn.name}
        onChange={onUploadFiles}
        style={{ display: "none" }}
        ref={fileRef}
      />
    </button>
  );
};
