import { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { BtnCreatePost } from "../btns/btn-create-post";
import { PostEditActions } from "./post-edit-actions";
import { TextIndicator } from "../other/text-indicator";
import {
  NewPost,
  NewPostImg,
  Post,
  QuotedPost,
} from "../../../../shared/interfaces/post.interface";
import { AppDispatch } from "../../store/types";
import {
  addNewPostToThread,
  setNewPostType,
  setNewPosts,
  updateCurrNewPost,
} from "../../store/actions/new-post.actions";
import { addPost, addQuotePost, addReply } from "../../store/actions/post.actions";
import { PostEditImg } from "./post-edit-img";
import { GifEdit } from "../gif/gif-edit";
import { BtnClose } from "../btns/btn-close";
import { UserImg } from "../user/user-img";
import { BtnToggleAudience } from "../btns/btn-toggle-audience";
import { BtnToggleRepliers } from "../btns/btn-toggle-repliers";
import { PollEdit } from "../poll/poll-edit";
import { PostDateTitle } from "../other/post-date-title";
import { IoLocationSharp } from "react-icons/io5";
import { useLocation, useNavigate } from "react-router-dom";
import { uploadFileToCloudinary } from "../../services/upload.service";
import { PostEditVideo } from "./post-edit-video";
import { PostList } from "./post-list";
import { MiniPostPreview } from "./mini-post-preview/mini-post-preview";
import { RepliedPostContent } from "./mini-post-preview/replied-post-content";
import { QuotedPostContent } from "./mini-post-preview/quoted-post-content";
import { setUserMsg } from "../../store/actions/system.actions";
import { PostTextInput } from "./post-text-input";
import { BtnRemovePostFromThread } from "./btn-remove-post-from-thread";
import { BtnAddThread } from "./btn-add-thread";

interface PostEditProps {
  isHomePage?: boolean;
  onClickBtnClose?: () => void;
}

// let renderCount = 0;

export const PostEdit: React.FC<PostEditProps> = ({ isHomePage = false, onClickBtnClose }) => {
  // console.log("PostEdit", ++renderCount);

  // State
  const { loggedinUser } = useSelector((state: RootState) => state.authModule);
  const { sideBar, homePage, reply, quote, newPostType } = useSelector(
    (state: RootState) => state.newPostModule
  );

  const [currNewPost, setCurrNewPost] = useState<NewPost | null>(null);
  const [replyToPost, setReplyToPost] = useState<Post | null>(null);
  const [quotedPost, setQuotedPost] = useState<Post | null>(null);
  const [preCurrNewPostList, setPreCurrNewPostList] = useState<NewPost[]>([]);
  const [postCurrNewPostList, setPostCurrNewPostList] = useState<NewPost[]>([]);
  const [inputTextValue, setInputTextValue] = useState(currNewPost?.text || "");
  // State - booleans
  const [isPickerShown, setIsPickerShown] = useState<boolean>(!isHomePage);
  const [isPostsValid, setIsPostsValid] = useState<boolean>(false);
  const [postSaveInProgress, setPostSaveInProgress] = useState<boolean>(false);
  const [isVideoRemoved, setIsVideoRemoved] = useState<boolean>(false);
  const [isFirstPostInThread, setIsFirstPostInThread] = useState<boolean>(false);

  // Refs
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const newPostTypeRef = useRef(newPostType);

  // Hooks
  const dispatch: AppDispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  // Variables
  const isAddingPostToThreadDisabled =
    preCurrNewPostList.length + postCurrNewPostList.length + 1 >= 10;
  const isMultipePosts = preCurrNewPostList.length + postCurrNewPostList.length + 1 > 1;
  const isBtnRemovePostFromThreadShown =
    !isFirstPostInThread &&
    !isHomePage &&
    (newPostTypeRef.current === "home-page" || newPostTypeRef.current === "side-bar") &&
    !checkPostValidity(currNewPost);

  const isPostDateTitleShown = currNewPost?.schedule && isFirstPostInThread;

  function setBtnTitleText(): string {
    const postType = newPostTypeRef.current;
    if (currNewPost?.schedule) return "Schedule";
    if (postType === "reply") return "Reply";
    return isMultipePosts && !isHomePage ? "Chirp All" : "Chirp";
  }

  function checkPostValidity(post: NewPost | null): boolean {
    if (!post) return false;

    function checkPostTextValidity(post: NewPost): boolean {
      let currPostText = "";
      if (newPostType === "home-page") {
        const currPostIdx = homePage.posts.findIndex(p => p.tempId === post.tempId);
        currPostText = currPostIdx === homePage.currPostIdx ? inputTextValue : post.text;
      } else if (newPostType === "side-bar") {
        const currPostIdx = sideBar.posts.findIndex(p => p.tempId === post.tempId);
        currPostText = currPostIdx === sideBar.currPostIdx ? inputTextValue : post.text;
      } else {
        currPostText = inputTextValue;
      }
      return currPostText.length > 0 && currPostText.length <= 247;
    }

    if (post.poll) {
      return (
        post.poll.options.every(option => option.text.length > 0) && checkPostTextValidity(post)
      );
    } else {
      return (
        checkPostTextValidity(post) ||
        post.imgs.length > 0 ||
        !!post.gif ||
        !!post.video ||
        !!post.quotedPostId
      );
    }
  }

  function checkPostArrayValidity(newPosts: NewPost[]): boolean {
    return newPosts.every(post => checkPostValidity(post));
  }

  async function onAddPost() {
    if (!currNewPost || !loggedinUser) return;
    try {
      setPostSaveInProgress(true);
      const newPosts = [...preCurrNewPostList, currNewPost, ...postCurrNewPostList];
      await uploadImagesAndSetToPost(newPosts);
      await uploadVideoAndSetToPost(newPosts);
      await dispatchPost(newPosts);
      resetState();
    } catch (err) {
      setPostSaveInProgress(false);
    }
  }

  async function uploadImagesAndSetToPost(newPosts: NewPost[]) {
    for (const post of newPosts) {
      if (!post.imgs.length) return;
      const prms = post.imgs.map(async (img, idx) => {
        const currImgUrl = await uploadFileToCloudinary(img.file, "image");
        return { url: currImgUrl, sortOrder: idx };
      });
      const savedImgUrl = await Promise.all(prms);
      post.imgs = savedImgUrl.filter(img => img.url) as unknown as NewPostImg[];
    }
  }

  async function uploadVideoAndSetToPost(newPosts: NewPost[]) {
    for (const post of newPosts) {
      if (!post.video) return;
      if (post.video.file) {
        const videoUrl = await uploadFileToCloudinary(post.video.file, "video");
        post.videoUrl = videoUrl;
      } else {
        post.videoUrl = post.video.url;
      }
      delete post.video;
    }
  }

  async function dispatchPost(newPosts: NewPost[]) {
    switch (newPostType) {
      case "quote":
        {
          const [post] = newPosts;
          await dispatch(addQuotePost(post));
        }
        break;
      case "reply":
        {
          const [post] = newPosts;
          await dispatch(addReply(post));
        }
        break;
      default: {
        await dispatch(addPost(newPosts));
      }
    }
  }

  function resetState() {
    dispatch(setNewPostType("home-page"));
    dispatch(setNewPosts([], newPostType));
    setInputTextValue("");
    setIsPickerShown(false);
    setPostSaveInProgress(false);
    setIsPostsValid(false);
    if (textAreaRef.current) textAreaRef.current.style.height = "auto";
    if (location.pathname === "/compose") navigate("/");
  }

  function openPicker() {
    if (!isHomePage && isPickerShown) return;
    setIsPickerShown(true);
    textAreaRef.current?.focus();
  }

  function onGoToLocationPage() {
    if (!isPickerShown) return;
    navigate("/post-location");
  }

  async function onAddPostToThread() {
    if (!isPickerShown) return;
    if (isHomePage) {
      if (!currNewPost) return;
      const newPost = { ...currNewPost, text: inputTextValue };
      await dispatch(updateCurrNewPost(newPost, newPostType));
      setIsPickerShown(false);
      await dispatch(addNewPostToThread(newPostType));
      navigate("/compose");
    } else {
      const isAddingPostToThreadDisabled =
        preCurrNewPostList.length + postCurrNewPostList.length + 1 >= 9;
      if (isAddingPostToThreadDisabled) {
        dispatch(
          setUserMsg({
            type: "info",
            text: "You can add more Chirps to this thread after sending these.",
          })
        );
      }
      await dispatch(addNewPostToThread(newPostType));
      textAreaRef.current?.focus();
    }
  }

  useEffect(() => {
    const isValid = checkPostArrayValidity(
      preCurrNewPostList.concat(currNewPost || [], postCurrNewPostList)
    );
    if (isValid !== isPostsValid) {
      setIsPostsValid(isValid);
    }

    if (isPickerShown && !isHomePage) {
      textAreaRef.current?.focus();
    }
  }, [preCurrNewPostList, currNewPost, inputTextValue.length, postCurrNewPostList]);

  useEffect(() => {
    const postType = newPostTypeRef.current;
    if (postType === "home-page") {
      const currPost = homePage.posts[homePage.currPostIdx];
      setPreCurrNewPostList(homePage.posts.filter((_, idx) => idx < homePage.currPostIdx));
      setCurrNewPost(currPost);
      setInputTextValue(currPost.text);
      setPostCurrNewPostList(homePage.posts.filter((_, idx) => idx > homePage.currPostIdx));
      setIsFirstPostInThread(homePage.currPostIdx === 0);
    } else if (postType === "side-bar") {
      const currPost = sideBar.posts[sideBar.currPostIdx];
      setPreCurrNewPostList(sideBar.posts.filter((_, idx) => idx < sideBar.currPostIdx));
      setCurrNewPost(currPost);
      setInputTextValue(currPost.text);
      setPostCurrNewPostList(sideBar.posts.filter((_, idx) => idx > sideBar.currPostIdx));
      setIsFirstPostInThread(sideBar.currPostIdx === 0);
    } else if (postType === "reply") {
      setCurrNewPost(reply.reply);
      setInputTextValue(reply.reply.text);
      setReplyToPost(reply.repliedToPost);
    } else if (postType === "quote") {
      setCurrNewPost(quote.quote);
      setInputTextValue(quote.quote.text);
      setQuotedPost(quote.quotedPost);
    }
    if (location.pathname === "/compose" && isHomePage) {
      setIsPickerShown(false);
      setPreCurrNewPostList([]);
      setCurrNewPost(null);
      setInputTextValue("");
      setPostCurrNewPostList([]);
    }

    return () => {
      setPreCurrNewPostList([]);
      setCurrNewPost(null);
      setInputTextValue("");
      setPostCurrNewPostList([]);
    };
  }, [
    homePage.posts,
    homePage.currPostIdx,
    sideBar.posts,
    sideBar.currPostIdx,
    reply,
    quote,
    location.pathname,
  ]);

  return (
    <section
      className={"post-edit" + (postSaveInProgress ? " save-mode" : "")}
      onClick={openPicker}
    >
      {onClickBtnClose && <BtnClose onClickBtn={onClickBtnClose} />}
      {postSaveInProgress && <span className="progress-bar"></span>}
      {!isHomePage && preCurrNewPostList.length > 0 && <PostList newPosts={preCurrNewPostList} />}
      {!isHomePage && replyToPost && (
        <MiniPostPreview post={replyToPost} type={"replied-post"}>
          {({ post }: { post: Post }) => <RepliedPostContent post={post} />}
        </MiniPostPreview>
      )}
      <div className="content-container">
        {loggedinUser && <UserImg imgUrl={loggedinUser?.imgUrl} />}
        <main className={"main-content" + (isHomePage && !isPickerShown ? " gap-0" : "")}>
          {isPickerShown && currNewPost && isFirstPostInThread && (
            <BtnToggleAudience currNewPost={currNewPost} />
          )}
          {isPostDateTitleShown && (
            <PostDateTitle date={currNewPost.schedule!} isLink={isPickerShown} />
          )}
          {isBtnRemovePostFromThreadShown && <BtnRemovePostFromThread newPostType={newPostType} />}

          <PostTextInput
            isHomePage={isHomePage}
            isPickerShown={isPickerShown}
            isFirstPostInThread={isFirstPostInThread}
            inputTextValue={inputTextValue}
            textAreaRef={textAreaRef}
            postType={newPostTypeRef.current}
            currNewPost={currNewPost}
            replyToPost={replyToPost}
            isVideoRemoved={isVideoRemoved}
            setInputTextValue={setInputTextValue}
          />
          {currNewPost && currNewPost.imgs.length > 0 && <PostEditImg currNewPost={currNewPost} />}
          {currNewPost?.video && (
            <PostEditVideo currNewPost={currNewPost} setIsVideoRemoved={setIsVideoRemoved} />
          )}
          {currNewPost?.gif && <GifEdit currNewPost={currNewPost} />}
          {currNewPost?.poll && <PollEdit currNewPost={currNewPost} />}
          <div className="btn-replires-location-container">
            {isPickerShown && currNewPost && <BtnToggleRepliers currNewPost={currNewPost} />}
            {currNewPost?.location && (
              <div className="post-edit-location-title" onClick={onGoToLocationPage}>
                <IoLocationSharp /> {currNewPost.location.name}
              </div>
            )}
          </div>
          {quotedPost && (
            <MiniPostPreview quotedPost={quotedPost} type={"quoted-post"}>
              {({ quotedPost }: { quotedPost: QuotedPost }) => (
                <QuotedPostContent quotedPost={quotedPost} />
              )}
            </MiniPostPreview>
          )}
          <div className={"btns-container" + (isPickerShown ? " border-show" : "")}>
            <PostEditActions
              currNewPost={currNewPost}
              isPickerShown={isPickerShown}
              inputTextValue={inputTextValue}
              setInputTextValue={setInputTextValue}
            />
            <div className="secondary-action-container">
              {(checkPostValidity(currNewPost) || inputTextValue.length > 0) && (
                <div className="indicator-thread-btn-container">
                  <TextIndicator textLength={inputTextValue.length} />
                  <hr className="vertical" />
                  <BtnAddThread
                    isDisabled={isAddingPostToThreadDisabled}
                    onAddPostToThread={onAddPostToThread}
                  />
                </div>
              )}
              <BtnCreatePost
                isSideBarBtn={false}
                isDisabled={!isPostsValid}
                onAddPost={onAddPost}
                btnText={setBtnTitleText()}
              />
            </div>
          </div>
        </main>
      </div>
      {!isHomePage && postCurrNewPostList.length > 0 && <PostList newPosts={postCurrNewPostList} />}
    </section>
  );
};
