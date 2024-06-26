import type { NextApiRequest, NextApiResponse } from 'next';
import { MongoChat } from '@fastgpt/service/core/chat/chatSchema';
import { MongoApp } from '@fastgpt/service/core/app/schema';
import { MongoOutLink } from '@fastgpt/service/support/outLink/schema';
import { authApp } from '@fastgpt/service/support/permission/app/auth';
import { MongoChatItem } from '@fastgpt/service/core/chat/chatItemSchema';
import { mongoSessionRun } from '@fastgpt/service/common/mongo/sessionRun';
import { MongoAppVersion } from '@fastgpt/service/core/app/version/schema';
import { NextAPI } from '@/service/middleware/entry';
import { MongoChatInputGuide } from '@fastgpt/service/core/chat/inputGuide/schema';
import { OwnerPermissionVal } from '@fastgpt/global/support/permission/constant';
import { findAppAndAllChildren } from '@fastgpt/service/core/app/controller';

async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  const { appId } = req.query as { appId: string };

  if (!appId) {
    throw new Error('参数错误');
  }

  // Auth owner (folder owner, can delete all apps in the folder)
  const { teamId } = await authApp({ req, authToken: true, appId, per: OwnerPermissionVal });

  const apps = await findAppAndAllChildren({
    teamId,
    appId,
    fields: '_id'
  });

  console.log(apps);

  await mongoSessionRun(async (session) => {
    for await (const app of apps) {
      const appId = app._id;
      // Chats
      await MongoChatItem.deleteMany(
        {
          appId
        },
        { session }
      );
      await MongoChat.deleteMany(
        {
          appId
        },
        { session }
      );
      // 删除分享链接
      await MongoOutLink.deleteMany(
        {
          appId
        },
        { session }
      );
      // delete version
      await MongoAppVersion.deleteMany(
        {
          appId
        },
        { session }
      );
      await MongoChatInputGuide.deleteMany(
        {
          appId
        },
        { session }
      );
      // delete app
      await MongoApp.deleteOne(
        {
          _id: appId
        },
        { session }
      );
    }
  });
}

export default NextAPI(handler);
