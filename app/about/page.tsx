"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Info, Mail, ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#fafaf9] selection:bg-amber-200 selection:text-amber-900 relative">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-size-[24px_24px] pointer-events-none"></div>

      <Link href="/dashboard" className="btn absolute top-6 left-6 z-20">
        <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
        Quay lại
      </Link>

      <div className="flex-1 flex flex-col justify-center items-center px-4 py-20 relative z-10 w-full mb-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="max-w-3xl w-full"
        >
          <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-stone-200 mb-8 mt-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-amber-100/50 text-amber-700 rounded-2xl">
                <Info className="size-6" />
              </div>
              <h1 className="title">Giới thiệu dự án</h1>
            </div>

            <div className="max-w-none">
              <p className="text-stone-600 leading-relaxed text-[15px] mb-8">
                <strong className="text-stone-800">Gia Phả chi họ Phạm - Thanh Giang </strong> .
              </p>

              <div className="mt-8 mb-4 border-t border-stone-100 pt-8 flex items-center gap-3">
                <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                  <ShieldAlert className="size-5" />
                </div>
                <h2 className="text-xl font-bold text-stone-900">

                </h2>
              </div>

              <div className="bg-stone-50 border border-stone-200/60 rounded-2xl p-6 text-[14.5px] leading-relaxed">
                <p className="font-bold text-stone-800 mb-4 bg-white py-2 px-3 rounded-lg border border-stone-200 shadow-sm inline-block">

                </p>

                <ul className="space-y-4 text-stone-600 list-disc pl-5">
                  <li>
                    <strong className="text-stone-800">

                    </strong>{" "}

                    <strong className="text-stone-800">

                    </strong>

                  </li>
                  <li>
                    <strong className="text-stone-800">

                    </strong>{" "}

                  </li>
                  <li>
                    <strong className="text-stone-800">

                    </strong>{" "}

                  </li>
                  <li>
                    <strong className="text-stone-800"> </strong>{" "}
                    {" "}
                    <code className="bg-white border border-stone-200 px-1 py-0.5 rounded text-[13px] text-amber-700">
                      Chi họ Phạm Văn - Thôn Đan Giáp - Xã Thanh Giang - Huyện Thanh Miện - Tỉnh Hải Dương.
                      (Ngày nay thuộc Xã Nam Thanh Miện - TP Hải Phòng)
                    </code>{" "}

                  </li>
                </ul>
              </div>

              <div className="mt-8 mb-4 border-t border-stone-100 pt-8 flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <Mail className="size-5" />
                </div>
                <h2 className="text-xl font-bold text-stone-900">

                </h2>
              </div>

              <p className="text-stone-600 leading-relaxed text-[15px] mb-8">
                {` `}
                <a
                  href="mailto:tvsammedia@gmail.com"
                  className="font-semibold text-amber-700 hover:text-amber-600 transition-colors inline-flex items-center gap-1.5 mt-2"
                >
                  Truy cập trang : https://giapha-chiho-pham-thanh-giang.vercel.app/
                </a>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
