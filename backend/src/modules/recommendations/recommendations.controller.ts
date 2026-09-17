import { Controller, Get, Param, Query, Request } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';

@Controller('recommendations')
export class RecommendationsController {
  constructor(private recommendationsService: RecommendationsService) {}

  @Get('feed')
  async feed(
    @Query('limit') limit = '24',
    @Query('offset') offset = '0',
    @Request() req: any,
  ) {
    return this.recommendationsService.feed(
      parseInt(limit, 10),
      parseInt(offset, 10),
      req.user?.id,
    );
  }

  @Get('related/:videoId')
  async related(
    @Param('videoId') videoId: string,
    @Query('limit') limit = '12',
  ) {
    return this.recommendationsService.related(
      videoId,
      parseInt(limit, 10),
    );
  }

  @Get('shorts')
  async shorts(@Query('limit') limit = '30') {
    return this.recommendationsService.trendingShorts(parseInt(limit, 10));
  }
}
