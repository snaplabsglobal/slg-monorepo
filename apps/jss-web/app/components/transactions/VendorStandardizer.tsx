"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

interface VendorStandardizerProps {
  rawVendorName: string;
  organizationId: string;
  transactionId?: string;
  onStandardized: (standardizedName: string) => void;
  className?: string;
}

export function VendorStandardizer({
  rawVendorName,
  organizationId,
  transactionId,
  onStandardized,
  className = "",
}: VendorStandardizerProps) {
  const [standardizedName, setStandardizedName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [userAction, setUserAction] = useState<
    "pending" | "accepted" | "rejected" | "modified"
  >("pending");

  const supabase = createClient();

  const handleStandardize = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Call Edge Function
      const { data, error: functionError } = await supabase.functions.invoke(
        "vendor-standardizer",
        {
          body: {
            raw_vendor_name: rawVendorName,
            organization_id: organizationId,
            transaction_id: transactionId,
          },
        }
      );

      if (functionError) throw functionError;

      setSuggestion(data);
      setStandardizedName(data.standardized_name);

      // If auto-accepted, call callback immediately
      if (data.auto_accepted) {
        setUserAction("accepted");
        onStandardized(data.standardized_name);
      } else {
        setUserAction("pending");
      }
    } catch (err: any) {
      console.error("Standardization error:", err);
      setError(err.message || "标准化失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!suggestion || !standardizedName) return;

    try {
      // Update vendor_standardization_log
      if (suggestion.log_id) {
        await supabase
          .from("vendor_standardization_log")
          .update({
            user_action: "accepted",
            actioned_by: (await supabase.auth.getUser()).data.user?.id,
            actioned_at: new Date().toISOString(),
          })
          .eq("id", suggestion.log_id);
      }

      // Optionally create/update vendor_alias
      const { error: aliasError } = await supabase
        .from("vendor_aliases")
        .upsert(
          {
            organization_id: organizationId,
            alias: rawVendorName,
            resolved_name: standardizedName,
          },
          {
            onConflict: "organization_id,alias",
          }
        );

      if (aliasError) {
        console.error("Error creating vendor alias:", aliasError);
      }

      setUserAction("accepted");
      onStandardized(standardizedName);
    } catch (err: any) {
      console.error("Error accepting standardization:", err);
      setError(err.message || "接受标准化失败");
    }
  };

  const handleReject = async () => {
    if (!suggestion?.log_id) return;

    try {
      await supabase
        .from("vendor_standardization_log")
        .update({
          user_action: "rejected",
          actioned_by: (await supabase.auth.getUser()).data.user?.id,
          actioned_at: new Date().toISOString(),
        })
        .eq("id", suggestion.log_id);

      setUserAction("rejected");
      setStandardizedName("");
    } catch (err: any) {
      console.error("Error rejecting standardization:", err);
      setError(err.message || "拒绝标准化失败");
    }
  };

  const handleModify = async () => {
    if (!standardizedName || !suggestion?.log_id) return;

    try {
      // Update log with user's modified name
      await supabase
        .from("vendor_standardization_log")
        .update({
          user_action: "modified",
          user_modified_name: standardizedName,
          actioned_by: (await supabase.auth.getUser()).data.user?.id,
          actioned_at: new Date().toISOString(),
        })
        .eq("id", suggestion.log_id);

      // Create/update vendor_alias with user's modification
      await supabase.from("vendor_aliases").upsert(
        {
          organization_id: organizationId,
          alias: rawVendorName,
          resolved_name: standardizedName,
        },
        {
          onConflict: "organization_id,alias",
        }
      );

      setUserAction("modified");
      onStandardized(standardizedName);
    } catch (err: any) {
      console.error("Error modifying standardization:", err);
      setError(err.message || "修改标准化失败");
    }
  };

  return (
    <div className={`vendor-standardizer ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">商户:</span>
        <span className="font-medium">{rawVendorName}</span>

        {!suggestion && (
          <button
            onClick={handleStandardize}
            disabled={isLoading}
            className="ml-2 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? "标准化中..." : "标准化"}
          </button>
        )}
      </div>

      {error && (
        <div className="mt-2 p-2 bg-red-100 border border-red-400 text-red-700 text-sm rounded">
          {error}
        </div>
      )}

      {suggestion && userAction === "pending" && (
        <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">
              标准化名称
              <span className="ml-2 text-xs text-gray-500">
                (置信度: {Math.round(suggestion.confidence_score * 100)}%)
              </span>
            </label>
            <input
              type="text"
              value={standardizedName}
              onChange={(e) => setStandardizedName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {suggestion.alternatives && suggestion.alternatives.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-gray-600 mb-1">备选名称:</p>
              <div className="flex flex-wrap gap-2">
                {suggestion.alternatives.map((alt: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setStandardizedName(alt)}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                  >
                    {alt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {suggestion.reasoning && (
            <p className="mb-3 text-xs text-gray-600 italic">
              {suggestion.reasoning}
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleAccept}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
            >
              接受
            </button>
            <button
              onClick={handleModify}
              disabled={!standardizedName}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              使用修改后的名称
            </button>
            <button
              onClick={handleReject}
              className="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              拒绝
            </button>
          </div>
        </div>
      )}

      {userAction === "accepted" && (
        <div className="mt-2 text-sm text-green-600">
          ✓ 已标准化为: {standardizedName}
        </div>
      )}

      {userAction === "modified" && (
        <div className="mt-2 text-sm text-blue-600">
          ✓ 已修改为: {standardizedName}
        </div>
      )}

      {userAction === "rejected" && (
        <div className="mt-2 text-sm text-gray-500">已拒绝标准化</div>
      )}
    </div>
  );
}
