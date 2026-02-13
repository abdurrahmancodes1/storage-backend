import { importDriveItems } from "../services/driveImportService.js";

export const importFromDrive = async (req, res) => {
  try {
    const user = req.user;
    const { token, items } = req.body;

    if (!token || !Array.isArray(items)) {
      return res.status(400).json({ error: "Invalid data" });
    }

    await importDriveItems({
      user,
      token,
      items,
    });

    res.status(200).json({ message: "Import completed" });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
};
