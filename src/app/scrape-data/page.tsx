"use client"

import Navbar from "@/components/Navbar";
import ScrapedDataTable from "@/components/ScrapedDataTable";
import React, { useState } from "react";

const DemoPage = () => {
  const [count, setCount] = useState(0);

  return (
    <div>
        <Navbar />
        <ScrapedDataTable />
    </div>
  );
};

export default DemoPage;
