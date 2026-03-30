import { CustomBlockRenderer } from "./CustomBlockRenderer.jsx";
import { CodeEditorField, CssEditorField } from "./CodeEditorField.jsx";

const DEFAULT_CODE = `const [count, setCount] = useState(0);

return (
  <Card title="Custom Component" style={{ maxWidth: 400 }}>
    <Flex gap={12} align="center">
      <Button type="primary" onClick={() => setCount(c => c + 1)}>
        Clicked {count} times
      </Button>
      <Typography.Text type="secondary">
        Edit this code in the sidebar
      </Typography.Text>
    </Flex>
  </Card>
);`;

export const CustomBlock = {
  label: "Custom Block",
  fields: {
    name: {
      type: "text",
      label: "Block Name",
    },
    code: {
      type: "custom",
      label: "JSX Code",
      render: CodeEditorField,
    },
    css: {
      type: "custom",
      label: "CSS Styles",
      render: CssEditorField,
    },
  },
  defaultProps: {
    name: "Custom Component",
    code: DEFAULT_CODE,
    css: "",
  },
  render: ({ id, name, code, css }) => {
    return <CustomBlockRenderer code={code} css={css} blockId={id} />;
  },
};
