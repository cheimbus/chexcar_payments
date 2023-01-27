import { Body, Controller, Post } from '@nestjs/common';
import { GetMembershipDto } from './dto/membership.dto';
import { MembershipService } from './membership.service';

@Controller()
export class MembershipController {
    constructor(private membershipService: MembershipService) { }

    @Post('memberships')
    async getMembership(@Body() data: GetMembershipDto) {
        return this.membershipService.getMembership({ data });
    }
}
