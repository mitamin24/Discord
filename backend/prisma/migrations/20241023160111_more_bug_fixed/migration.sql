-- AddForeignKey
ALTER TABLE "Rooms" ADD CONSTRAINT "Rooms_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
