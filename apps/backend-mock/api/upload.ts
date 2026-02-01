import { eventHandler } from 'h3';
import { verifyAccessToken } from '~/utils/jwt-utils';
import { unAuthorizedResponse, useResponseSuccess } from '~/utils/response';

export default eventHandler((event) => {
  const userinfo = verifyAccessToken(event);
  if (!userinfo) {
    return unAuthorizedResponse(event);
  }
  return useResponseSuccess({
    // 方案1：返回站点绝对路径，让前端从自身站点的 public/assets 加载，避免第三方图片请求
    url: '/assets/logo-v1.webp',
  });
  // return useResponseError("test")
});
