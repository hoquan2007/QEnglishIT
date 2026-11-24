// Shared database reads for the importer and the independent QA reporter.
export async function request(factory, label) {
  for (let attempt = 0;; attempt++) {
    try {
      const result = await factory();
      if (result.error) throw Object.assign(new Error(result.error.message), result.error, { status: result.status });
      return result;
    } catch (error) {
      const network = /fetch failed|network|ECONNRESET|ETIMEDOUT|ECONNREFUSED|EAI_AGAIN|socket|timeout/i.test(`${error.message} ${error.details ?? ''} ${error.cause?.code ?? ''}`) || [502, 503, 504].includes(error.status);
      if (!network || attempt >= 3) throw new Error(`${label}: ${error.message}`, { cause: error });
      console.warn(`${label}: network retry ${attempt + 1}/3`);
      await new Promise(resolve => setTimeout(resolve, 250 * 2 ** attempt));
    }
  }
}

export async function fetchAll(sb, table, columns = '*', filter = q => q) {
  const rows = [];
  for (let offset = 0;; offset += 500) {
    const { data } = await request(() => filter(sb.from(table).select(columns)).order(table === 'irregular_verbs' ? 'base' : 'id').range(offset, offset + 499), `${table} read`);
    rows.push(...data);
    if (data.length < 500) return rows;
  }
}
