using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AssetManagement.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class MakeReportedByNullable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_MaintenanceTickets_Users_ReportedByUserId",
                table: "MaintenanceTickets");

            migrationBuilder.AlterColumn<int>(
                name: "ReportedByUserId",
                table: "MaintenanceTickets",
                type: "INTEGER",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "INTEGER");

            migrationBuilder.AddForeignKey(
                name: "FK_MaintenanceTickets_Users_ReportedByUserId",
                table: "MaintenanceTickets",
                column: "ReportedByUserId",
                principalTable: "Users",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_MaintenanceTickets_Users_ReportedByUserId",
                table: "MaintenanceTickets");

            migrationBuilder.AlterColumn<int>(
                name: "ReportedByUserId",
                table: "MaintenanceTickets",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "INTEGER",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_MaintenanceTickets_Users_ReportedByUserId",
                table: "MaintenanceTickets",
                column: "ReportedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
