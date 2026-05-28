import { atom } from 'nanostores';

export const isEditing = atom(false);

export const toggleEditing = () => {
  isEditing.set(!isEditing.get());
};
