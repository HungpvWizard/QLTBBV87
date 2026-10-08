using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AssetManagement.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMedicalAssetFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "DenNgay",
                table: "Assets",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "HdDen",
                table: "Assets",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "HdTu",
                table: "Assets",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "KyHieu",
                table: "Assets",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "LegacyId",
                table: "Assets",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "NamSD",
                table: "Assets",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NuocSX",
                table: "Assets",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "SoLuuHanh",
                table: "Assets",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "TuNgay",
                table: "Assets",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DenNgay",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "HdDen",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "HdTu",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "KyHieu",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "LegacyId",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "NamSD",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "NuocSX",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "SoLuuHanh",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "TuNgay",
                table: "Assets");
        }
    }
}
