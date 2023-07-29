import { useEffect, useState } from "react";
import { Post } from "../../../../../shared/interfaces/post.interface";
import postService from "../../../services/post.service";
import { Outlet } from "react-router-dom";

export const BookmarksPage = () => {
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Post[]>([]);

  const getBookmarkedPosts = async () => {
    const posts = await postService.getBookmarkedPosts();
    setBookmarkedPosts(posts);
  };

  useEffect(() => {
    document.title = "Bookmarks / Chirper";
    getBookmarkedPosts();

    return () => {
      setBookmarkedPosts([]);
    };
  }, []);

  return (
    <div>
      <h1>Bookmarks Page</h1>
      <h4>Nums of Posts: {bookmarkedPosts.length}</h4>
      {bookmarkedPosts.length > 0 && (
        <div style={{ width: "600px", overflow: "hidden" }}>
          {bookmarkedPosts.map(post => (
            <pre key={post.id}>{JSON.stringify(post, null, 2)}</pre>
          ))}
        </div>
      )}
      <Outlet />
    </div>
  );
};
