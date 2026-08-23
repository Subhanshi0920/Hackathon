import { getTheme, DSTYPOGRAPHY_TOKENS } from "@am92/react-design-system";

const theme = getTheme();

// MUI's Typography renders any variant missing from its (fixed) built-in
// variantMapping as an inline <span>. am92's custom tokens aren't in that
// map, so stacked <DsTypography> siblings (heading + subtitle, etc.) were
// running together on one line instead of wrapping onto their own.
const variantMapping = Object.fromEntries(DSTYPOGRAPHY_TOKENS.map((token) => [token, "div"]));
theme.components = {
  ...theme.components,
  MuiTypography: {
    ...theme.components?.MuiTypography,
    defaultProps: {
      ...theme.components?.MuiTypography?.defaultProps,
      variantMapping: {
        ...theme.components?.MuiTypography?.defaultProps?.variantMapping,
        ...variantMapping,
      },
    },
  },
};

export default theme;
