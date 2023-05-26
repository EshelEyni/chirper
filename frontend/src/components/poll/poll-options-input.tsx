import { AiOutlinePlus } from "react-icons/ai";
import { createRef, useState, useEffect, FC, useRef } from "react";
import { AppDispatch } from "../../store/types";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { NewPost } from "../../../../shared/interfaces/post.interface";
import { setNewPost } from "../../store/actions/post.actions";
import { NewPostType } from "../../store/reducers/post.reducer";

export const PollOptionsInput: FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const {
    newPost,
    sideBarNewPost,
    newPostType,
  }: { newPost: NewPost; sideBarNewPost: NewPost; newPostType: NewPostType } = useSelector(
    (state: RootState) => state.postModule
  );

  const newPostTypeRef = useRef(newPostType);
  const currPost = newPostTypeRef.current === "side-bar-post" ? sideBarNewPost : newPost;

  const [inputRefs, setInputRefs] = useState<React.RefObject<HTMLInputElement>[]>([]);

  useEffect(() => {
    setInputRefs(currPost.poll!.options.map(() => createRef<HTMLInputElement>()));
    inputRefs[0]?.current?.focus();
  }, [currPost.poll!.options.length]);

  useEffect(() => {
    if (inputRefs.length > 0) {
      inputRefs[0].current?.focus();
    }
  }, [inputRefs]);

  const [focused, setFocused] = useState<Record<string, boolean>>({
    choice1: false,
    choice2: false,
    choice3: false,
    choice4: false,
  });

  const onAddChoice = () => {
    if (currPost.poll!.options.length < 5) {
      const defaultOption = {
        text: "",
        voteSum: 0,
        isLoggedinUserVoted: false,
      };
      dispatch(
        setNewPost(
          {
            ...currPost,
            poll: {
              ...currPost.poll!,
              options: [...currPost.poll!.options, defaultOption],
            },
          },
          newPostType
        )
      );
    }
  };

  const onFocusChoice = (idx: number) => {
    setFocused({ ...focused, [`option${idx + 1}`]: true });
    setTimeout(() => {
      inputRefs[idx].current?.focus();
    }, 0);
  };

  const onBlurChoice = (idx: number) => {
    setFocused({ ...focused, [`option${idx + 1}`]: false });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const options = [...currPost.poll!.options];
    options[idx].text = e.target.value;
    dispatch(
      setNewPost(
        {
          ...currPost,
          poll: {
            ...currPost.poll!,
            options,
          },
        },
        newPostType
      )
    );
  };

  return (
    <div className="poll-options-container">
      {currPost.poll!.options.map((option, idx) => (
        <div
          key={idx}
          className={
            "poll-option-container" + (focused[`option${idx + 1}`] ? " option-focused" : "")
          }
        >
          <div className="poll-option">
            <input
              className={`poll-option-input ${idx}`}
              type="text"
              onChange={e => {
                handleChange(e, idx);
              }}
              onFocus={() => {
                onFocusChoice(idx);
              }}
              onBlur={() => {
                onBlurChoice(idx);
              }}
              ref={inputRefs[idx]}
              maxLength={25}
            />
            <span className={"option-input-placeholder" + (option ? " text-filled" : "")}>
              {`Choice ${idx + 1}`}
            </span>
            {focused[`option${idx + 1}`] && (
              <span className="option-text-indicator">{option.text.length + "/" + 25}</span>
            )}
          </div>
          {idx === currPost.poll!.options.length - 1 && idx != 3 && (
            <button className="btn-add-option" onClick={onAddChoice}>
              <AiOutlinePlus className="add-option-icon" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
};
