import { handle } from "../context/UsersContext";
import type { Friend } from "../types";

// Rows of people: photo, @username and name (tap to open their profile) and a Follow button
export default function PeopleList({
  people,
  currentUserId,
  following,
  onToggleFollow,
  onOpenProfile,
}: {
  people: Friend[];
  currentUserId: string;
  following: string[]; // IDs the signed-in user follows
  onToggleFollow: (person: Friend) => void;
  onOpenProfile: (id: string) => void;
}) {
  return (
    <div className="people-list">
      {people.map((person) => {
        const isFollowing = following.includes(person.id);
        return (
          <div className="profile-friend-row" key={person.id}>
            <button className="profile-link profile-friend-person" onClick={() => onOpenProfile(person.id)} type="button">
              <span className="profile-friend-avatar" style={{ background: person.color }}>
                {person.avatar ? <img alt="" src={person.avatar} /> : person.name.charAt(0).toUpperCase()}
              </span>
              <span className="profile-friend-copy">
                <b>{handle(person) || person.name}</b>
                {handle(person) && <small>{person.name}</small>}
              </span>
            </button>
            {person.id !== currentUserId && (
              <button
                aria-label={`${isFollowing ? "Unfollow" : "Follow"} ${handle(person) || person.name}`}
                aria-pressed={isFollowing}
                className={isFollowing ? "added" : "follow"}
                onClick={() => onToggleFollow(person)}
                type="button"
              >
                {isFollowing ? "Following" : "Follow"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
