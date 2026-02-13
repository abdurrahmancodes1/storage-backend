import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const s3Client = new S3Client({
  region: "ap-south-1",
  profile: "abdur",
  credentials: {
    accessKeyId: process.env.AWS_ACCESSKEY_ID,

    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export const createUploadSignedUrl = async ({ key, contentType }) => {
  if (!key) {
    throw new Error("S3 key is required");
  }
  console.log("Received key:", key);

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  const url = await getSignedUrl(s3Client, command, {
    expiresIn: 3600,
    signableHeaders: new Set(["content-type"]),
  });
  return url;
};

export const createGetSignedUrl = async ({ key, download, filename }) => {
  if (!key) {
    throw new Error("S3 key is required");
  }
  const disposition = download
    ? `attachment; filename="${encodeURIComponent(filename)}"`
    : "inline";
  console.log("Received key:", key);

  const command = new GetObjectCommand({
    Bucket: process.env.AWS_BUCKET,
    Key: key,
    ResponseContentDisposition: disposition,
  });
  const url = await getSignedUrl(s3Client, command, {
    expiresIn: 3600,
  });
  return url;
};

export const getS3FileMetaData = async (key) => {
  const command = new HeadObjectCommand({
    Bucket: process.env.AWS_BUCKET,
    Key: key,
  });
  return await s3Client.send(command);
};

export const deleteS3File = async (key) => {
  const command = new DeleteObjectCommand({
    Bucket: process.env.AWS_BUCKET,
    Key: key,
  });
  return await s3Client.send(command);
};

export const deleteS3Files = async (keys) => {
  const command = new DeleteObjectsCommand({
    Bucket: process.env.AWS_BUCKET,
    Delete: {
      Objects: keys,
    },
    Quiet: false,
  });
  return await s3Client.send(command);
};
