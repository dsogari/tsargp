import { AnsiString, ErrorMessage, ParsingCallback, Range } from '../library';
import { getSymbol, readFile } from '../library/utils';

/**
 * Create a parsing callback for numbers that should be within a range.
 * @param range The numeric range
 * @param phrase The custom error phrase
 * @returns The parsing callback
 */
export function numberInRange(range: Range, phrase: string): ParsingCallback<string, number> {
  const [min, max] = range;
  return function (param, info) {
    const num = Number(param);
    if (info.comp || (min <= num && num <= max)) {
      return num; // handle NaN; avoid throwing errors when completion is in effect
    }
    throw ErrorMessage.createCustom(phrase, {}, getSymbol(info.name), param, range);
  };
}

/**
 * Create a footer text to be used in help sections.
 * @param packageJsonPath The path to the package.json file
 * @param phrase The custom phrase for the footer
 * @param suffix A suffix to append to the repository URL
 * @returns The footer text
 */
export async function sectionFooter(
  packageJsonPath: URL,
  phrase: string = '#0',
  suffix: string = '',
): Promise<string | undefined> {
  const data = await readFile(packageJsonPath);
  if (data !== undefined) {
    const { repository } = JSON.parse(data) as { repository?: string | { url?: string } };
    if (repository) {
      const repoUrl = typeof repository === 'string' ? repository : repository.url;
      if (repoUrl) {
        let url = repoUrl.replace(/(?:^git\+|\.git$)/g, '');
        if (!url.startsWith('https:')) {
          const [host, repo] = url.split(':');
          url = `https://${repo ? host : 'github'}.com/${repo ?? host}`;
        }
        const str = new AnsiString().format(phrase, {}, new URL(url + suffix));
        const result: Array<string> = [];
        str.wrap(result, 0, 0, true, true);
        return result.join('');
      }
    }
  }
  return undefined;
}
