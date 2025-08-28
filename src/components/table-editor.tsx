import type React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronLeft,
  Plus,
  Filter,
  ArrowUpDown,
  Search,
  Settings,
  RefreshCw,
  Download,
  Share,
  MoreHorizontal,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DataRow {
  id: string;
  name: string;
  address: string;
  language: string;
  version: string;
  state: string;
  createdDate: string;
  isNew?: boolean;
  isEdited?: boolean;
}

const PAGE_SIZE = 50;

export function TableEditor() {
  const [editingCell, setEditingCell] = useState<{
    rowId: string;
    field: string;
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [localEdits, setLocalEdits] = useState<
    Record<string, Partial<DataRow>>
  >({});
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const tableRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch data with infinite query
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: ["tableData"],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await fetch(
        "https://microsoftedge.github.io/Demos/json-dummy-data/5MB.json"
      );
      if (!response.ok) throw new Error("Failed to fetch data");

      const allData = await response.json();
      const startIndex = pageParam * PAGE_SIZE;
      const endIndex = startIndex + PAGE_SIZE;

      // Transform data to match our interface
      const transformedData: DataRow[] = allData
        .slice(startIndex, endIndex)
        .map((item: DataRow, index: number) => ({
          id: item.id || `row-${startIndex + index}`,
          name: item.name || "",
          address: item.address || "",
          language:
            item.language ||
            ["English", "Spanish", "French", "German"][
              Math.floor(Math.random() * 4)
            ],
          version: item.version,
          state:
            item.state ||
            ["CA", "NY", "TX", "FL", "IL"][Math.floor(Math.random() * 5)],
          createdDate: "2020-05-04 09:18:16",
        }));

      return {
        data: transformedData,
        nextCursor: endIndex < allData.length ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
  });

  // Flatten all pages data
  const allRows = data?.pages.flatMap((page) => page.data) || [];

  // Apply local edits and search filter
  const processedRows = allRows
    .map((row) => ({
      ...row,
      ...localEdits[row.id],
    }))
    .filter((row) => {
      if (!searchQuery) return true;
      const searchLower = searchQuery.toLowerCase();
      return Object.values(row).some((value) =>
        String(value).toLowerCase().includes(searchLower)
      );
    });

  // Apply sorting
  const sortedRows = sortField
    ? [...processedRows].sort((a, b) => {
        const aVal = String(a[sortField as keyof DataRow]);
        const bVal = String(b[sortField as keyof DataRow]);
        const comparison = aVal.localeCompare(bVal);
        return sortDirection === "asc" ? comparison : -comparison;
      })
    : processedRows;

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    if (!tableRef.current || !hasNextPage || isFetchingNextPage) return;

    const { scrollTop, scrollHeight, clientHeight } = tableRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  useEffect(() => {
    const tableElement = tableRef.current;
    if (tableElement) {
      tableElement.addEventListener("scroll", handleScroll);
      return () => tableElement.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);

  // Cell editing handlers
  const startEditing = (rowId: string, field: string, currentValue: string) => {
    setEditingCell({ rowId, field });
    setEditValue(currentValue);
  };

  const commitEdit = () => {
    if (!editingCell) return;

    const { rowId, field } = editingCell;
    setLocalEdits((prev) => ({
      ...prev,
      [rowId]: {
        ...prev[rowId],
        [field]: editValue,
        isEdited: true,
      },
    }));

    setEditingCell(null);
    setEditValue("");
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      commitEdit();
    } else if (e.key === "Escape") {
      cancelEdit();
    }
  };

  // Add new row
  const addNewRow = () => {
    const newId = `new-${Date.now()}`;
    const newRow: DataRow = {
      id: newId,
      name: "",
      address: "",
      language: "English",
      version: "new customer",
      state: "",
      createdDate: new Date().toISOString().slice(0, 19).replace("T", " "),
      isNew: true,
    };

    setLocalEdits((prev) => ({
      ...prev,
      [newId]: newRow,
    }));
  };

  // Row selection handlers
  const toggleRowSelection = (rowId: string) => {
    setSelectedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        newSet.add(rowId);
      }
      return newSet;
    });
  };

  const toggleAllRows = () => {
    if (selectedRows.size === sortedRows.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(sortedRows.map((row) => row.id)));
    }
  };

  // Sort handler
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-destructive mb-4">Failed to load data</p>
          <Button
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: ["tableData"] })
            }
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b">
        <Button variant="ghost" size="sm">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">Table name</h1>
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={addNewRow}>
            <Plus className="h-4 w-4 mr-2" />
            Add row
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            Sort
            {sortedRows.length !== allRows.length && (
              <Badge variant="destructive" className="ml-1 h-4 w-4 p-0 text-xs">
                1
              </Badge>
            )}
          </Button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-48"
            />
          </div>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Fields
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm">
            <Share className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Action
                <MoreHorizontal className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Export</DropdownMenuItem>
              <DropdownMenuItem>Import</DropdownMenuItem>
              <DropdownMenuItem>Duplicate</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
            <Sparkles className="h-4 w-4 mr-2" />
            Ask AI
          </Button>
        </div>
      </div>

      {/* Table */}
      <div ref={tableRef} className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-background border-b">
            <tr>
              <th className="w-12 p-3 text-left">
                <Checkbox
                  checked={
                    selectedRows.size === sortedRows.length &&
                    sortedRows.length > 0
                  }
                  onCheckedChange={toggleAllRows}
                />
              </th>
              <th className="p-3 text-left text-sm font-medium text-muted-foreground">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("id")}
                  className="h-auto p-0 font-medium"
                >
                  ID
                  {sortField === "id" && (
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  )}
                </Button>
              </th>
              <th className="p-3 text-left text-sm font-medium text-muted-foreground min-w-[200px]">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("address")}
                  className="h-auto p-0 font-medium"
                >
                  Bio
                  {sortField === "address" && (
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  )}
                </Button>
              </th>
              <th className="p-3 text-left text-sm font-medium text-muted-foreground">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("name")}
                  className="h-auto p-0 font-medium"
                >
                  Name
                  {sortField === "name" && (
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  )}
                </Button>
              </th>
              <th className="p-3 text-left text-sm font-medium text-muted-foreground">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("language")}
                  className="h-auto p-0 font-medium"
                >
                  Language
                  {sortField === "language" && (
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  )}
                </Button>
              </th>
              <th className="p-3 text-left text-sm font-medium text-muted-foreground">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("version")}
                  className="h-auto p-0 font-medium"
                >
                  Version
                  {sortField === "version" && (
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  )}
                </Button>
              </th>
              <th className="p-3 text-left text-sm font-medium text-muted-foreground">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("state")}
                  className="h-auto p-0 font-medium"
                >
                  State
                  {sortField === "state" && (
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  )}
                </Button>
              </th>
              <th className="p-3 text-left text-sm font-medium text-muted-foreground">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("createdDate")}
                  className="h-auto p-0 font-medium"
                >
                  Created Date
                  {sortField === "createdDate" && (
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  )}
                </Button>
              </th>
              <th className="w-12 p-3">
                <Button variant="ghost" size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, index) => (
              <tr
                key={`${row.id}-${index}`}
                className={cn(
                  "border-b hover:bg-muted/50",
                  row.isNew && "bg-blue-50",
                  row.isEdited && "bg-yellow-50"
                )}
              >
                <td className="p-3">
                  <Checkbox
                    checked={selectedRows.has(row.id)}
                    onCheckedChange={() => toggleRowSelection(row.id)}
                  />
                </td>
                <td className="p-3 text-sm">{row.id}</td>
                <td className="p-3 text-sm max-w-[200px]">
                  {editingCell?.rowId === row.id &&
                  editingCell?.field === "address" ? (
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={handleKeyDown}
                      className="h-8"
                      autoFocus
                    />
                  ) : (
                    <div
                      className="cursor-pointer hover:bg-muted/50 p-1 rounded truncate"
                      onClick={() =>
                        startEditing(row.id, "address", row.address)
                      }
                    >
                      {row.address || "Click to edit"}
                    </div>
                  )}
                </td>
                <td className="p-3 text-sm">
                  {editingCell?.rowId === row.id &&
                  editingCell?.field === "name" ? (
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={handleKeyDown}
                      className="h-8"
                      autoFocus
                    />
                  ) : (
                    <div
                      className="cursor-pointer hover:bg-muted/50 p-1 rounded"
                      onClick={() => startEditing(row.id, "name", row.name)}
                    >
                      {row.name || "Click to edit"}
                    </div>
                  )}
                </td>
                <td className="p-3 text-sm">
                  {editingCell?.rowId === row.id &&
                  editingCell?.field === "language" ? (
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={handleKeyDown}
                      className="h-8"
                      autoFocus
                    />
                  ) : (
                    <div
                      className="cursor-pointer hover:bg-muted/50 p-1 rounded"
                      onClick={() =>
                        startEditing(row.id, "language", row.language)
                      }
                    >
                      {row.language}
                    </div>
                  )}
                </td>
                <td className="p-3">
                  <Badge variant="outline" className="text-xs">
                    {row.version}
                  </Badge>
                </td>
                <td className="p-3 text-sm">
                  {editingCell?.rowId === row.id &&
                  editingCell?.field === "state" ? (
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={handleKeyDown}
                      className="h-8 w-16"
                      autoFocus
                    />
                  ) : (
                    <div
                      className="cursor-pointer hover:bg-muted/50 p-1 rounded"
                      onClick={() => startEditing(row.id, "state", row.state)}
                    >
                      {row.state}
                    </div>
                  )}
                </td>
                <td className="p-3 text-sm text-muted-foreground">
                  {row.createdDate}
                </td>
                <td className="p-3">
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}

            {/* Loading indicator */}
            {isFetchingNextPage && (
              <tr>
                <td colSpan={9} className="p-8 text-center">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
                  <p className="text-sm text-muted-foreground mt-2">
                    Loading more rows...
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="border-t p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            className="bg-primary text-primary-foreground"
          >
            Sheet 1
          </Button>
          <Button variant="ghost" size="sm">
            Sheet 2
          </Button>
          <Button variant="ghost" size="sm">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          Showing {sortedRows.length} rows
          {selectedRows.size > 0 && ` • ${selectedRows.size} selected`}
        </div>
      </div>
    </div>
  );
}
