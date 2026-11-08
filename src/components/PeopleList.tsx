import FriendButton from "./FriendButton";
import { handle } from "../context/UsersContext";
import { friendStatus, type FriendAction, type FriendState } from "../lib/db";
import type { Friend } from "../types";

// Rows of people: photo, @username and name (tap to open their profile) and a friend button
export default function PeopleList({
  people,
  currentUserId,
  friendState,
  onFriendAction,
  onOpenProfile,
}: {
  people: Friend[];
  currentUserId: string;
  friendState: FriendState; // the signed-in user's friends and requests
  onFriendAction: (person: Friend, action: FriendAction) => void;
  onOpenProfile: (id: string) => void;
}) {
  return (
    <div className="people-list">
      {people.map((person) => (
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
            <FriendButton
              name={handle(person) || person.name}
              onAction={(action) => onFriendAction(person, action)}
              status={friendStatus(friendState, person.id)}
            />
          )}
        </div>
      ))}
    </div>
  );
}
