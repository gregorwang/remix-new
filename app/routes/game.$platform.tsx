import type { LinksFunction, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link, useParams } from "@remix-run/react";
import { Suspense, lazy } from "react";
import gameStyles from "~/styles/game.css?url";
import { generateImageTokens } from "~/utils/imageToken.server";

// Import the client component using lazy loading for better bundle splitting
const GamePageClient = lazy(() => import("~/components/game/GamePageClient.client"));

// Import utils for platform validation and pagination logic
import { 
  getValidPlatformId, 
  paginateGames,
  sortGamesByProgressAndRating 
} from "~/lib/utils/gameUtils";

// Import game data (这应该移到数据库或单独的数据文件)
import { userStats, platforms, allGamesData, followedGames } from "~/lib/data/gameData";
import type { PlatformId } from "~/lib/types/game";

// --- Remix Meta ---
export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) {
    return [
      { title: "游戏中心 - 未找到" },
      { name: "description", content: "游戏平台未找到" },
    ];
  }

  const platformName = data.platforms.find(p => p.id === data.platformId)?.name || '游戏';
  
  return [
    { title: `${platformName} - 我的游戏收藏` },
    { name: "description", content: `展示我的 ${platformName} 游戏收藏、成就和评分` },
  ];
};

// --- Remix Links ---
export const links: LinksFunction = () => [
  { rel: "stylesheet", href: gameStyles },
];

// Loader function - 使用路由参数而不是查询参数
export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  
  // 从路由参数获取平台 (推荐的 Remix 模式)
  const platformIdParam = params.platform || "playstation";
  const currentPage = parseInt(url.searchParams.get("page") || "1", 10);
  
  // 验证平台ID
  const platformId = getValidPlatformId(platformIdParam, 'playstation') as PlatformId;
  
  // 如果平台无效，重定向到有效平台
  if (platformId !== platformIdParam) {
    throw new Response("Platform not found", { 
      status: 404,
      statusText: "Platform not found" 
    });
  }
  
  // 使用工具函数进行分页计算
  const sortedGames = sortGamesByProgressAndRating(allGamesData[platformId]);
  const paginationResult = paginateGames(sortedGames, currentPage, 8);

  // 收集所有图片路径
  const allImagePaths = [
    'game/jkl.jpg',
    ...paginationResult.paginatedGames.map(game => game.cover),
    ...followedGames.map(game => game.cover),
  ];

  // 批量生成所有图片token
  const tokenResults = generateImageTokens(allImagePaths, 30);
  const tokenMap = new Map(tokenResults.map(result => [result.imageName, result.imageUrl]));

  // 替换所有游戏封面的src为带token的完整URL
  const paginatedGames = paginationResult.paginatedGames.map(game => ({
    ...game,
    cover: tokenMap.get(game.cover) || game.cover
  }));

  const followedGamesWithTokens = followedGames.map(game => ({
    ...game,
    cover: tokenMap.get(game.cover) || game.cover
  }));

  const avatarImageUrl = tokenMap.get('game/jkl.jpg') || 'game/jkl.jpg';

  const data = {
    userStats,
    platforms,
    platformId,
    paginatedGames,
    totalGames: paginationResult.totalGames,
    totalPages: paginationResult.totalPages,
    currentPage: paginationResult.currentPage,
    followedGames: followedGamesWithTokens,
    avatarImageUrl,
  };

  return json(data, {
    headers: {
      "Cache-Control": "public, max-age=300",
      "Content-Type": "application/json",
    },
  });
};

// --- Main Component ---
export default function GamePlatformRoute() {
  const data = useLoaderData<typeof loader>();
  const params = useParams();

  return (
    <div className="min-h-screen bg-primary-50 relative overflow-hidden">
      {/* Dynamic background particles with warm accent color */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-accent/20 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Navigation links - 使用固定间距和正确字体 + 动画：300ms + ease-expo-out */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-1.5">
        <div className="flex items-center gap-3">
          {/* 返回首页 */}
          <Link
            to="/"
            prefetch="intent"
            className="inline-flex items-center gap-0.5 text-base font-medium text-primary-950/70 leading-normal transition-colors duration-300 ease-expo-out hover:text-accent-hover group"
          >
            <svg className="w-5 h-5 transition-transform duration-300 ease-expo-out group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>返回首页</span>
          </Link>

          {/* 分隔符 */}
          <span className="text-primary-950/30">/</span>

          {/* 返回平台选择 */}
          <Link
            to="/game"
            prefetch="intent"
            className="inline-flex items-center gap-0.5 text-base font-medium text-primary-950/70 leading-normal transition-colors duration-300 ease-expo-out hover:text-accent-hover group"
          >
            <svg className="w-5 h-5 transition-transform duration-300 ease-expo-out group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            <span>返回平台选择</span>
          </Link>
        </div>
      </div>

      <div className="relative z-10">
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen">
            {/* Loading 文字 - text-xl + font-medium + leading-normal */}
            <div className="text-primary-950 text-xl font-medium leading-normal">Loading {params.platform} games...</div>
          </div>
        }>
          <GamePageClient {...data} />
        </Suspense>
      </div>
    </div>
  );
}

// 错误边界 - Remix 最佳实践
export function ErrorBoundary() {
  return (
    <div className="min-h-screen bg-primary-50 flex items-center justify-center px-6">
      <div className="text-center">
        {/* H1 标题 - text-4xl + font-bold + leading-tight + tracking-tight */}
        <h1 className="text-4xl font-bold text-primary-950 mb-2 leading-tight tracking-tight">平台未找到</h1>
        {/* 描述文字 - text-base + leading-relaxed */}
        <p className="text-base text-primary-950/70 mb-3 leading-relaxed">
          抱歉，我们找不到这个游戏平台。
        </p>
        {/* 按钮 - text-sm + font-medium + 固定内边距 + rounded (12px) + 动画：transform + shadow */}
        <Link 
          to="/game" 
          className="inline-block px-1.5 py-0.75 bg-gradient-to-r from-accent to-accent-hover text-white text-sm font-medium rounded transition-all duration-300 ease-expo-out hover:-translate-y-0.5 hover:shadow-lg"
        >
          返回平台选择
        </Link>
      </div>
    </div>
  );
}

