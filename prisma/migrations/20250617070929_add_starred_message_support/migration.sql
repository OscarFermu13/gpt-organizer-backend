/*
  Warnings:

  - You are about to drop the column `notes` on the `Chat` table. All the data in the column will be lost.
  - You are about to drop the `ChatTag` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Tag` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ChatTag" DROP CONSTRAINT "ChatTag_chatId_fkey";

-- DropForeignKey
ALTER TABLE "ChatTag" DROP CONSTRAINT "ChatTag_tagId_fkey";

-- DropForeignKey
ALTER TABLE "Tag" DROP CONSTRAINT "Tag_userId_fkey";

-- AlterTable
ALTER TABLE "Chat" DROP COLUMN "notes";

-- DropTable
DROP TABLE "ChatTag";

-- DropTable
DROP TABLE "Tag";

-- CreateTable
CREATE TABLE "StarredMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "messageIndex" INTEGER NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "StarredMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StarredMessage_chatId_messageIndex_userId_key" ON "StarredMessage"("chatId", "messageIndex", "userId");

-- AddForeignKey
ALTER TABLE "StarredMessage" ADD CONSTRAINT "StarredMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StarredMessage" ADD CONSTRAINT "StarredMessage_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
