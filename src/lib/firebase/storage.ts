
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from '../firebase'; // Assuming 'app' is your initialized Firebase app

const storage = getStorage(app);

/**
 * Uploads a file to Firebase Storage and returns its public URL.
 *
 * @param file The file to upload.
 * @param path The path in Firebase Storage where the file should be stored (e.g., 'project-images/some-project-id').
 * @returns A promise that resolves with the public download URL of the file.
 */
export const uploadFile = async (file: File, path: string): Promise<string> => {
  if (!file) {
    throw new Error('No file provided for upload.');
  }

  const storageRef = ref(storage, path);

  try {
    // Upload the file to the specified path.
    const snapshot = await uploadBytes(storageRef, file);

    // Get the public URL of the uploaded file.
    const downloadURL = await getDownloadURL(snapshot.ref);

    return downloadURL;
  } catch (error) {
    console.error('Error uploading file to Firebase Storage:', error);
    // Re-throw the error to be handled by the calling code.
    throw error;
  }
};
