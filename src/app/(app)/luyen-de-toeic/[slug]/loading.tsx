export default function Loading() {
  return (
    <div className="mx-auto grid min-h-screen max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[1fr_300px]" aria-busy="true" aria-label="Đang tải đề thi">
      <div className="space-y-4">
        <div className="skeleton h-14" />
        <div className="skeleton h-72" />
        <div className="skeleton h-40" />
      </div>
      <div className="skeleton hidden h-96 lg:block" />
    </div>
  );
}
