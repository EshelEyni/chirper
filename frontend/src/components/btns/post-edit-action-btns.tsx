import { FiImage, FiList } from "react-icons/fi";
import { RiFileGifLine } from "react-icons/ri";
import { CiCalendarDate } from "react-icons/ci";
import { BsEmojiSmile } from "react-icons/bs";
import { HiOutlineLocationMarker } from "react-icons/hi";
import { useDispatch } from "react-redux";
import { AppDispatch } from "../../store/types";
import { setUserMsg } from "../../store/actions/system.actions";
import React, { useEffect, useState } from "react";
import { PostEditGiffPickerModal } from "../post/post-edit-gif-picker";

interface PostEditActionBtnsProps {
  imgUrls: { url: string; isLoading: boolean }[];
  setImgUrls: (urls: { url: string; isLoading: boolean }[]) => void;
  giffUrl: string;
  setGiffUrl: (url: string) => void;
}

export const PostEditActionBtns: React.FC<PostEditActionBtnsProps> = ({
  imgUrls,
  setImgUrls,
  giffUrl,
  setGiffUrl,
}) => {
  const dispatch: AppDispatch = useDispatch();
  const [isMultiple, setIsMultiple] = useState(true);
  const [isGiffPickerShown, setIsGiffPickerShown] = useState(false);

  useEffect(() => {
    if (imgUrls.length < 3) setIsMultiple(true);
    else setIsMultiple(false);
  }, [imgUrls]);

  const btns: {
    name: string;
    icon: JSX.Element;
    type?: string;
    isDisabled: boolean;
    onClickFn?: () => void;
  }[] = [
    {
      name: "img-upload",
      icon: <FiImage />,
      type: "file",
      isDisabled: imgUrls.length === 4,
    },
    {
      name: "gif-upload",
      icon: <RiFileGifLine />,
      isDisabled: imgUrls.length > 0 || !!giffUrl,
      onClickFn: () => setIsGiffPickerShown(true),
    },
    {
      name: "poll",
      icon: <FiList />,
      isDisabled: imgUrls.length > 0 || !!giffUrl,
    },
    {
      name: "emoji",
      icon: <BsEmojiSmile />,
      isDisabled: false,
    },
    {
      name: "schedule",
      icon: <CiCalendarDate />,
      isDisabled: false,
    },
    {
      name: "location",
      icon: <HiOutlineLocationMarker />,
      isDisabled: false,
    },
  ];

  const readAsDataURL = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result && typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Failed to read file."));
        }
      };
      reader.readAsDataURL(file);
    });

  const onUploadImgs = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = ev.target;
    if (!files) return;

    let newImgUrls = [...imgUrls];

    const msg = "Please choose either 1 GIF or up to 4 photos.";
    if (files.length > 4 || files.length + imgUrls.length > 4) {
      dispatch(setUserMsg(msg));
      return;
    }

    for (let i = 0; i < files.length; i++) {
      try {
        const file = files[i];

        if (file) {
          const currIdx = newImgUrls.length;
          newImgUrls.push({ url: "", isLoading: true });
          setImgUrls([...newImgUrls]);

          const dataUrl = await readAsDataURL(file);
          newImgUrls[currIdx] = { url: dataUrl, isLoading: false };
          setImgUrls([...newImgUrls]);
        }
      } catch (error) {
        console.error("Error reading file:", error);
      }
    }
  };

  return (
    <React.Fragment>
      <div className="post-edit-action-btns">
        {btns.map((btn, idx) => {
          if (btn.name === "img-upload") {
            return (
              <label
                htmlFor={btn.name}
                key={idx}
                className={
                  "post-edit-action-btn" + (btn.isDisabled ? " disabled" : "")
                }
              >
                <div className="post-edit-action-icon-container">
                  {btn.icon}
                </div>
                <input
                  type={btn.type}
                  multiple={isMultiple}
                  disabled={imgUrls.length === 4}
                  id={btn.name}
                  onChange={onUploadImgs}
                  style={{ display: "none" }}
                />
              </label>
            );
          } else {
            return (
              <button
                key={idx}
                className={
                  "post-edit-action-btn" + (btn.isDisabled ? " disabled" : "")
                }
                onClick={btn.onClickFn}
              >
                <div className="post-edit-action-icon-container">
                  {btn.icon}
                </div>
              </button>
            );
          }
        })}
      </div>
      {isGiffPickerShown && (
        <PostEditGiffPickerModal
          giffUrl={giffUrl}
          setGiffUrl={setGiffUrl}
          setIsGiffPickerShown={setIsGiffPickerShown}
        />
      )}
    </React.Fragment>
  );
};
