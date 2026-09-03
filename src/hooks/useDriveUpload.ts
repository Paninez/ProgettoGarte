import { useDatabase } from "../context/DatabaseContext";
import { rowToDettaglio, rowToGradingItem, clearSheetRange, deleteSheetRow } from "../lib/googleApi";
import { ProjectFolders, uploadImageToDrive, createProjectFolderStructure, findOrCreateDriveFolder, findFolder, createFolder } from "../lib/googleApi";

export function useDriveUpload() {
  const { token, driveFolders, isProd, handleUpdateDriveFolders, addSafetyLog } = useDatabase();

  const handleUploadPhoto = async (file: File, folderType?: keyof ProjectFolders, customName?: string, subFolderName?: string): Promise<string> => {
    if (!token) throw new Error("Autenticazione mancante.");
    let folderId = "";
    if (folderType && driveFolders && driveFolders[folderType]) {
      folderId = driveFolders[folderType] as string;
    } else {
      folderId = await findOrCreateDriveFolder(token, isProd);
    }
    
    try {
      let targetFolderId = folderId;
      if (subFolderName) {
        let subFolderId = await findFolder(token, subFolderName, targetFolderId);
        if (!subFolderId) {
          subFolderId = await createFolder(token, subFolderName, targetFolderId);
        }
        targetFolderId = subFolderId;
      }

      return await uploadImageToDrive(file, targetFolderId, token, customName);
    } catch (err: any) {
      if (err.message.includes("404") || err.message.includes("notFound") || err.message.includes("File not found")) {
        addSafetyLog(`Cartella Drive non trovata. Rigenero struttura cartelle...`);
        const newFolders = await createProjectFolderStructure(token, isProd);
        handleUpdateDriveFolders(newFolders);
        let retryFolderId = folderType ? (newFolders[folderType] as string) : await findOrCreateDriveFolder(token, isProd);
        if (subFolderName) {
          let retrySubFolderId = await findFolder(token, subFolderName, retryFolderId);
          if (!retrySubFolderId) {
            retrySubFolderId = await createFolder(token, subFolderName, retryFolderId);
          }
          retryFolderId = retrySubFolderId;
        }
        return await uploadImageToDrive(file, retryFolderId, token, customName);
      }
      throw err;
    }
  };




  return {
    handleUploadPhoto
  };
}
