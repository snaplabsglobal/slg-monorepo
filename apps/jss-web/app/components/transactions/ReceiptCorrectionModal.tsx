"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

interface ReceiptCorrectionModalProps {
  transactionId: string;
  originalData: {
    vendor_name?: string;
    total_amount?: number;
    transaction_date?: string;
    currency?: string;
    tax_amount?: number;
    line_items?: Array<{
      item_name: string;
      raw_name: string;
      quantity: number;
      unit_price: number;
      amount: number;
      category?: string;
    }>;
    [key: string]: any;
  };
  isOpen: boolean;
  onClose: () => void;
  onSave: (correctedData: any) => Promise<void>;
}

export function ReceiptCorrectionModal({
  transactionId,
  originalData,
  isOpen,
  onClose,
  onSave,
}: ReceiptCorrectionModalProps) {
  const [correctedData, setCorrectedData] = useState(originalData);
  const [correctionFields, setCorrectionFields] = useState<string[]>([]);
  const [correctionReason, setCorrectionReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // Reset form when modal opens/closes or originalData changes
  useEffect(() => {
    if (isOpen) {
      setCorrectedData(originalData);
      setCorrectionFields([]);
      setCorrectionReason("");
      setError(null);
    }
  }, [isOpen, originalData]);

  const handleFieldChange = (field: string, value: any) => {
    setCorrectedData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Track which fields were corrected
    if (JSON.stringify(originalData[field]) !== JSON.stringify(value)) {
      if (!correctionFields.includes(field)) {
        setCorrectionFields([...correctionFields, field]);
      }
    } else {
      setCorrectionFields(correctionFields.filter((f) => f !== field));
    }
  };

  const handleLineItemChange = (
    index: number,
    field: string,
    value: any
  ) => {
    const updatedItems = [...(correctedData.line_items || [])];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    };

    handleFieldChange("line_items", updatedItems);

    // Track line_items as corrected if any item changed
    const originalItems = originalData.line_items || [];
    if (
      JSON.stringify(originalItems) !== JSON.stringify(updatedItems) &&
      !correctionFields.includes("line_items")
    ) {
      setCorrectionFields([...correctionFields, "line_items"]);
    }
  };

  const handleSave = async () => {
    if (correctionFields.length === 0) {
      setError("请至少修正一个字段");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // 1. Save correction to ML training data
      const { data: correctionRecord, error: correctionError } =
        await supabase.rpc("record_ml_correction", {
          p_transaction_id: transactionId,
          p_original_extraction: originalData,
          p_corrected_data: correctedData,
          p_correction_fields: correctionFields,
          p_correction_reason: correctionReason || null,
        });

      if (correctionError) throw correctionError;

      // 2. Update the transaction with corrected data
      const updatePayload: any = {};
      if (correctionFields.includes("vendor_name")) {
        updatePayload.vendor_name = correctedData.vendor_name;
      }
      if (correctionFields.includes("total_amount")) {
        updatePayload.total_amount = correctedData.total_amount;
      }
      if (correctionFields.includes("transaction_date")) {
        updatePayload.transaction_date = correctedData.transaction_date;
      }
      if (correctionFields.includes("currency")) {
        updatePayload.currency = correctedData.currency;
      }
      if (correctionFields.includes("tax_amount")) {
        updatePayload.tax_amount = correctedData.tax_amount;
      }

      // Update transaction
      const { error: updateError } = await supabase
        .from("transactions")
        .update(updatePayload)
        .eq("id", transactionId);

      if (updateError) throw updateError;

      // 3. Update line items if corrected
      if (correctionFields.includes("line_items")) {
        // Delete existing items
        await supabase
          .from("transaction_items")
          .delete()
          .eq("transaction_id", transactionId);

        // Insert corrected items
        if (correctedData.line_items && correctedData.line_items.length > 0) {
          const itemsToInsert = correctedData.line_items.map((item) => ({
            transaction_id: transactionId,
            description: item.item_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            amount: item.amount,
            category_tax: item.category,
          }));

          const { error: itemsError } = await supabase
            .from("transaction_items")
            .insert(itemsToInsert);

          if (itemsError) throw itemsError;
        }
      }

      // 4. Call parent's onSave callback
      await onSave(correctedData);

      onClose();
    } catch (err: any) {
      console.error("Error saving correction:", err);
      setError(err.message || "保存修正记录失败");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">修正收据识别结果</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Correction Form */}
          <div className="space-y-6">
            {/* Vendor Name */}
            <div>
              <label className="block text-sm font-medium mb-2">
                商户名称
                {correctionFields.includes("vendor_name") && (
                  <span className="ml-2 text-orange-600 text-xs">
                    (已修正)
                  </span>
                )}
              </label>
              <input
                type="text"
                value={correctedData.vendor_name || ""}
                onChange={(e) =>
                  handleFieldChange("vendor_name", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {originalData.vendor_name !== correctedData.vendor_name && (
                <p className="mt-1 text-xs text-gray-500">
                  原值: {originalData.vendor_name}
                </p>
              )}
            </div>

            {/* Transaction Date */}
            <div>
              <label className="block text-sm font-medium mb-2">
                交易日期
                {correctionFields.includes("transaction_date") && (
                  <span className="ml-2 text-orange-600 text-xs">
                    (已修正)
                  </span>
                )}
              </label>
              <input
                type="date"
                value={correctedData.transaction_date || ""}
                onChange={(e) =>
                  handleFieldChange("transaction_date", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Amount Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  总金额
                  {correctionFields.includes("total_amount") && (
                    <span className="ml-2 text-orange-600 text-xs">
                      (已修正)
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={correctedData.total_amount || 0}
                  onChange={(e) =>
                    handleFieldChange(
                      "total_amount",
                      parseFloat(e.target.value) || 0
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  税费
                  {correctionFields.includes("tax_amount") && (
                    <span className="ml-2 text-orange-600 text-xs">
                      (已修正)
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={correctedData.tax_amount || 0}
                  onChange={(e) =>
                    handleFieldChange(
                      "tax_amount",
                      parseFloat(e.target.value) || 0
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Currency */}
            <div>
              <label className="block text-sm font-medium mb-2">
                货币
                {correctionFields.includes("currency") && (
                  <span className="ml-2 text-orange-600 text-xs">
                    (已修正)
                  </span>
                )}
              </label>
              <select
                value={correctedData.currency || "CAD"}
                onChange={(e) => handleFieldChange("currency", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="CAD">CAD (加元)</option>
                <option value="USD">USD (美元)</option>
              </select>
            </div>

            {/* Line Items */}
            {correctedData.line_items && correctedData.line_items.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  明细项目
                  {correctionFields.includes("line_items") && (
                    <span className="ml-2 text-orange-600 text-xs">
                      (已修正)
                    </span>
                  )}
                </label>
                <div className="space-y-3 border border-gray-200 rounded-md p-4">
                  {correctedData.line_items.map((item, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-5 gap-2 p-2 bg-gray-50 rounded"
                    >
                      <input
                        type="text"
                        value={item.item_name}
                        onChange={(e) =>
                          handleLineItemChange(index, "item_name", e.target.value)
                        }
                        placeholder="项目名称"
                        className="col-span-2 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) =>
                          handleLineItemChange(
                            index,
                            "quantity",
                            parseFloat(e.target.value) || 1
                          )
                        }
                        placeholder="数量"
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) =>
                          handleLineItemChange(
                            index,
                            "unit_price",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        placeholder="单价"
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={item.amount}
                        onChange={(e) =>
                          handleLineItemChange(
                            index,
                            "amount",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        placeholder="金额"
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Correction Reason */}
            <div>
              <label className="block text-sm font-medium mb-2">
                修正原因 (可选)
              </label>
              <textarea
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                placeholder="请说明为什么需要修正这些字段..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              disabled={isSaving}
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || correctionFields.length === 0}
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "保存中..." : "保存修正"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
