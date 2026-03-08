import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import { BoxIcon } from "@/icons";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Buttons | GymHub Dashboard",
  description: "Dashboard buttons page",
};

export default function Buttons() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Buttons" />
      <div className="space-y-5 sm:space-y-6">
        <ComponentCard title="Primary Button">
          <div className="flex items-center gap-5">
            <Button size="sm" variant="primary">Button Text</Button>
            <Button size="md" variant="primary">Button Text</Button>
          </div>
        </ComponentCard>
        <ComponentCard title="Primary Button with Left Icon">
          <div className="flex items-center gap-5">
            <Button size="sm" variant="primary" startIcon={<BoxIcon />}>Button Text</Button>
            <Button size="md" variant="primary" startIcon={<BoxIcon />}>Button Text</Button>
          </div>
        </ComponentCard>
        <ComponentCard title="Primary Button with Right Icon">
          <div className="flex items-center gap-5">
            <Button size="sm" variant="primary" endIcon={<BoxIcon />}>Button Text</Button>
            <Button size="md" variant="primary" endIcon={<BoxIcon />}>Button Text</Button>
          </div>
        </ComponentCard>
        <ComponentCard title="Secondary Button">
          <div className="flex items-center gap-5">
            <Button size="sm" variant="outline">Button Text</Button>
            <Button size="md" variant="outline">Button Text</Button>
          </div>
        </ComponentCard>
        <ComponentCard title="Outline Button with Left Icon">
          <div className="flex items-center gap-5">
            <Button size="sm" variant="outline" startIcon={<BoxIcon />}>Button Text</Button>
            <Button size="md" variant="outline" startIcon={<BoxIcon />}>Button Text</Button>
          </div>
        </ComponentCard>
        <ComponentCard title="Outline Button with Right Icon">
          <div className="flex items-center gap-5">
            <Button size="sm" variant="outline" endIcon={<BoxIcon />}>Button Text</Button>
            <Button size="md" variant="outline" endIcon={<BoxIcon />}>Button Text</Button>
          </div>
        </ComponentCard>
      </div>
    </div>
  );
}
