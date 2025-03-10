import React, { useMemo, useState } from "react";
import Select, {
  OnChangeValue,
  StylesConfig,
  OptionProps,
  components as reactSelectComponents,
  Options,
  MenuListProps,
  GroupBase,
  OptionsOrGroups,
  DropdownIndicatorProps,
} from "react-select";
import CreatableSelect from "react-select/creatable";

import * as GQL from "src/core/generated-graphql";
import {
  useAllMoviesForFilter,
  useMarkerStrings,
  useMovieCreate,
} from "src/core/StashService";
import { useToast } from "src/hooks/Toast";
import { SelectComponents } from "react-select/dist/declarations/src/components";
import { ConfigurationContext } from "src/hooks/Config";
import { useIntl } from "react-intl";
import { objectTitle } from "src/core/files";
import { galleryTitle } from "src/core/galleries";
import { defaultMaxOptionsShown } from "src/core/config";
import { useDebounce } from "src/hooks/debounce";
import { Placement } from "react-bootstrap/esm/Overlay";
import { PerformerIDSelect } from "../Performers/PerformerSelect";
import { Icon } from "./Icon";
import { faTableColumns } from "@fortawesome/free-solid-svg-icons";
import { TagIDSelect } from "../Tags/TagSelect";
import { StudioIDSelect } from "../Studios/StudioSelect";

export type SelectObject = {
  id: string;
  name?: string | null;
  title?: string | null;
};
type Option = { value: string; label: string };

interface ITypeProps {
  type?:
    | "performers"
    | "studios"
    | "tags"
    | "scene_tags"
    | "performer_tags"
    | "movies";
}
interface IFilterProps {
  ids?: string[];
  initialIds?: string[];
  onSelect?: (item: SelectObject[]) => void;
  noSelectionString?: string;
  className?: string;
  isMulti?: boolean;
  isClearable?: boolean;
  isDisabled?: boolean;
  creatable?: boolean;
  menuPortalTarget?: HTMLElement | null;
}
interface ISelectProps<T extends boolean> {
  className?: string;
  items: Option[];
  selectedOptions?: OnChangeValue<Option, T>;
  creatable?: boolean;
  onCreateOption?: (value: string) => void;
  isLoading: boolean;
  isDisabled?: boolean;
  onChange: (item: OnChangeValue<Option, T>) => void;
  initialIds?: string[];
  isMulti: T;
  isClearable?: boolean;
  onInputChange?: (input: string) => void;
  components?: Partial<SelectComponents<Option, T, GroupBase<Option>>>;
  filterOption?: (option: Option, rawInput: string) => boolean;
  isValidNewOption?: (
    inputValue: string,
    value: Options<Option>,
    options: OptionsOrGroups<Option, GroupBase<Option>>
  ) => boolean;
  placeholder?: string;
  showDropdown?: boolean;
  groupHeader?: string;
  menuPortalTarget?: HTMLElement | null;
  closeMenuOnSelect?: boolean;
  noOptionsMessage?: string | null;
}
interface IFilterComponentProps extends IFilterProps {
  items: SelectObject[];
  toOption?: (item: SelectObject) => Option;
  onCreate?: (name: string) => Promise<{ item: SelectObject; message: string }>;
}
interface IFilterSelectProps<T extends boolean>
  extends Pick<
    ISelectProps<T>,
    | "isLoading"
    | "isMulti"
    | "components"
    | "filterOption"
    | "isValidNewOption"
    | "placeholder"
    | "closeMenuOnSelect"
  > {}

type TitledObject = { id: string; title: string };
interface ITitledSelect {
  className?: string;
  selected: TitledObject[];
  onSelect: (items: TitledObject[]) => void;
  isMulti?: boolean;
  disabled?: boolean;
}

const getSelectedItems = (selectedItems: OnChangeValue<Option, boolean>) => {
  if (Array.isArray(selectedItems)) {
    return selectedItems;
  } else if (selectedItems) {
    return [selectedItems];
  } else {
    return [];
  }
};

const getSelectedValues = (selectedItems: OnChangeValue<Option, boolean>) =>
  getSelectedItems(selectedItems).map((item) => item.value);

const LimitedSelectMenu = <T extends boolean>(
  props: MenuListProps<Option, T, GroupBase<Option>>
) => {
  const { configuration } = React.useContext(ConfigurationContext);
  const maxOptionsShown =
    configuration?.ui.maxOptionsShown ?? defaultMaxOptionsShown;

  const [hiddenCount, setHiddenCount] = useState<number>(0);
  const hiddenCountStyle = {
    padding: "8px 12px",
    opacity: "50%",
  };
  const menuChildren = useMemo(() => {
    if (Array.isArray(props.children)) {
      // limit the number of select options showing in the select dropdowns
      // always showing the 'Create "..."' option when it exists
      let creationOptionIndex = (props.children as React.ReactNode[]).findIndex(
        (child: React.ReactNode) => {
          let maybeCreatableOption = child as React.ReactElement<
            OptionProps<
              Option & { __isNew__: boolean },
              T,
              GroupBase<Option & { __isNew__: boolean }>
            >,
            ""
          >;
          return maybeCreatableOption?.props?.data?.__isNew__;
        }
      );
      if (creationOptionIndex >= maxOptionsShown) {
        setHiddenCount(props.children.length - maxOptionsShown - 1);
        return props.children
          .slice(0, maxOptionsShown - 1)
          .concat([props.children[creationOptionIndex]]);
      } else {
        setHiddenCount(Math.max(props.children.length - maxOptionsShown, 0));
        return props.children.slice(0, maxOptionsShown);
      }
    }
    setHiddenCount(0);
    return props.children;
  }, [props.children, maxOptionsShown]);
  return (
    <reactSelectComponents.MenuList {...props}>
      {menuChildren}
      {hiddenCount > 0 && (
        <div style={hiddenCountStyle}>{hiddenCount} Options Hidden</div>
      )}
    </reactSelectComponents.MenuList>
  );
};

const SelectComponent = <T extends boolean>({
  type,
  initialIds,
  onChange,
  className,
  items,
  selectedOptions,
  isLoading,
  isDisabled = false,
  onCreateOption,
  isClearable = true,
  creatable = false,
  isMulti,
  onInputChange,
  filterOption,
  isValidNewOption,
  components,
  placeholder,
  showDropdown = true,
  groupHeader,
  menuPortalTarget,
  closeMenuOnSelect = true,
  noOptionsMessage = type !== "tags" ? "None" : null,
}: ISelectProps<T> & ITypeProps) => {
  const values = items.filter((item) => initialIds?.indexOf(item.value) !== -1);
  const defaultValue = (isMulti ? values : values[0] ?? null) as OnChangeValue<
    Option,
    T
  >;

  const options = groupHeader
    ? [
        {
          label: groupHeader,
          options: items,
        },
      ]
    : items;

  const styles: StylesConfig<Option, T> = {
    option: (base) => ({
      ...base,
      color: "#000",
    }),
    container: (base, state) => ({
      ...base,
      zIndex: state.isFocused ? 10 : base.zIndex,
    }),
    multiValueRemove: (base, state) => ({
      ...base,
      color: state.isFocused ? base.color : "#333333",
    }),
  };

  const props = {
    options,
    value: selectedOptions,
    className,
    classNamePrefix: "react-select",
    onChange,
    isMulti,
    isClearable,
    defaultValue: defaultValue ?? undefined,
    noOptionsMessage: () => noOptionsMessage,
    placeholder: isDisabled ? "" : placeholder,
    onInputChange,
    filterOption,
    isValidNewOption,
    isDisabled,
    isLoading,
    styles,
    closeMenuOnSelect,
    menuPortalTarget,
    components: {
      ...components,
      MenuList: LimitedSelectMenu,
      IndicatorSeparator: () => null,
      ...((!showDropdown || isDisabled) && { DropdownIndicator: () => null }),
      ...(isDisabled && { MultiValueRemove: () => null }),
    },
  };

  return creatable ? (
    <CreatableSelect
      {...props}
      isDisabled={isLoading || isDisabled}
      onCreateOption={onCreateOption}
    />
  ) : (
    <Select {...props} />
  );
};

const FilterSelectComponent = <T extends boolean>(
  props: IFilterComponentProps & ITypeProps & IFilterSelectProps<T>
) => {
  const { items, ids, isMulti, onSelect } = props;
  const [loading, setLoading] = useState(false);
  const selectedIds = ids ?? [];
  const Toast = useToast();

  const options = items.map((i) => {
    if (props.toOption) {
      return props.toOption(i);
    }
    return {
      value: i.id,
      label: i.name ?? i.title ?? "",
    };
  });

  const selected = options.filter((option) =>
    selectedIds.includes(option.value)
  );
  const selectedOptions = (
    isMulti ? selected : selected[0] ?? null
  ) as OnChangeValue<Option, T>;

  const onChange = (selectedItems: OnChangeValue<Option, boolean>) => {
    const selectedValues = getSelectedValues(selectedItems);
    onSelect?.(items.filter((item) => selectedValues.includes(item.id)));
  };

  const onCreate = async (name: string) => {
    try {
      setLoading(true);
      const { item: newItem, message } = await props.onCreate!(name);
      props.onSelect?.([
        ...items.filter((item) => selectedIds.includes(item.id)),
        newItem,
      ]);
      setLoading(false);
      Toast.success(
        <span>
          {message}: <b>{name}</b>
        </span>
      );
    } catch (e) {
      Toast.error(e);
    }
  };

  return (
    <SelectComponent<T>
      {...props}
      isLoading={props.isLoading || loading}
      onChange={onChange}
      items={options}
      selectedOptions={selectedOptions}
      onCreateOption={props.creatable ? onCreate : undefined}
    />
  );
};

export const GallerySelect: React.FC<ITitledSelect> = (props) => {
  const [query, setQuery] = useState<string>("");
  const { data, loading } = GQL.useFindGalleriesQuery({
    skip: query === "",
    variables: {
      filter: {
        q: query,
      },
    },
  });

  const galleries = data?.findGalleries.galleries ?? [];
  const items = galleries.map((g) => ({
    label: galleryTitle(g),
    value: g.id,
  }));

  const onInputChange = useDebounce(setQuery, 500);

  const onChange = (selectedItems: OnChangeValue<Option, boolean>) => {
    const selected = getSelectedItems(selectedItems);
    props.onSelect(
      selected.map((s) => ({
        id: s.value,
        title: s.label,
      }))
    );
  };

  const options = props.selected.map((g) => ({
    value: g.id,
    label: g.title ?? "Unknown",
  }));

  return (
    <SelectComponent
      className={props.className}
      onChange={onChange}
      onInputChange={onInputChange}
      isLoading={loading}
      items={items}
      selectedOptions={options}
      isMulti
      placeholder="Search for gallery..."
      noOptionsMessage={query === "" ? null : "No galleries found."}
      showDropdown={false}
      isDisabled={props.disabled}
    />
  );
};

export const SceneSelect: React.FC<ITitledSelect> = (props) => {
  const [query, setQuery] = useState<string>("");
  const { data, loading } = GQL.useFindScenesQuery({
    skip: query === "",
    variables: {
      filter: {
        q: query,
      },
    },
  });

  const scenes = data?.findScenes.scenes ?? [];
  const items = scenes.map((s) => ({
    label: objectTitle(s),
    value: s.id,
  }));

  const onInputChange = useDebounce(setQuery, 500);

  const onChange = (selectedItems: OnChangeValue<Option, boolean>) => {
    const selected = getSelectedItems(selectedItems);
    props.onSelect(
      (selected ?? []).map((s) => ({
        id: s.value,
        title: s.label,
      }))
    );
  };

  const options = props.selected.map((s) => ({
    value: s.id,
    label: s.title,
  }));

  return (
    <SelectComponent
      onChange={onChange}
      onInputChange={onInputChange}
      isLoading={loading}
      items={items}
      selectedOptions={options}
      isMulti={props.isMulti ?? false}
      placeholder="Search for scene..."
      noOptionsMessage={query === "" ? null : "No scenes found."}
      showDropdown={false}
      isDisabled={props.disabled}
    />
  );
};

export const ImageSelect: React.FC<ITitledSelect> = (props) => {
  const [query, setQuery] = useState<string>("");
  const { data, loading } = GQL.useFindImagesQuery({
    skip: query === "",
    variables: {
      filter: {
        q: query,
      },
    },
  });

  const images = data?.findImages.images ?? [];
  const items = images.map((s) => ({
    label: objectTitle(s),
    value: s.id,
  }));

  const onInputChange = useDebounce(setQuery, 500);

  const onChange = (selectedItems: OnChangeValue<Option, boolean>) => {
    const selected = getSelectedItems(selectedItems);
    props.onSelect(
      (selected ?? []).map((s) => ({
        id: s.value,
        title: s.label,
      }))
    );
  };

  const options = props.selected.map((s) => ({
    value: s.id,
    label: s.title,
  }));

  return (
    <SelectComponent
      onChange={onChange}
      onInputChange={onInputChange}
      isLoading={loading}
      items={items}
      selectedOptions={options}
      isMulti={props.isMulti ?? false}
      placeholder="Search for image..."
      noOptionsMessage={query === "" ? null : "No images found."}
      showDropdown={false}
      isDisabled={props.disabled}
    />
  );
};

interface IMarkerSuggestProps {
  initialMarkerTitle?: string;
  onChange: (title: string) => void;
}
export const MarkerTitleSuggest: React.FC<IMarkerSuggestProps> = (props) => {
  const { data, loading } = useMarkerStrings();
  const suggestions = data?.markerStrings ?? [];

  const onChange = (selectedItem: OnChangeValue<Option, false>) =>
    props.onChange(selectedItem?.value ?? "");

  const items = suggestions.map((item) => ({
    label: item?.title ?? "",
    value: item?.title ?? "",
  }));
  const initialIds = props.initialMarkerTitle ? [props.initialMarkerTitle] : [];

  // add initial value to items if still loading, to ensure existing value
  // is populated
  if (loading && initialIds.length > 0) {
    items.push({
      label: initialIds[0],
      value: initialIds[0],
    });
  }

  return (
    <SelectComponent
      isMulti={false}
      creatable
      onChange={onChange}
      isLoading={loading}
      items={items}
      initialIds={initialIds}
      placeholder="Marker title..."
      className="select-suggest"
      showDropdown={false}
      groupHeader="Previously used titles..."
    />
  );
};

export const PerformerSelect: React.FC<IFilterProps> = (props) => {
  return <PerformerIDSelect {...props} />;
};

export const StudioSelect: React.FC<
  IFilterProps & { excludeIds?: string[] }
> = (props) => {
  return <StudioIDSelect {...props} />;
};

export const MovieSelect: React.FC<IFilterProps> = (props) => {
  const { data, loading } = useAllMoviesForFilter();
  const [createMovie] = useMovieCreate();
  const items = data?.allMovies ?? [];
  const intl = useIntl();

  const { configuration } = React.useContext(ConfigurationContext);
  const defaultCreatable =
    !configuration?.interface.disableDropdownCreate.movie ?? true;

  const onCreate = async (name: string) => {
    const result = await createMovie({
      variables: { input: { name } },
    });
    return {
      item: result.data!.movieCreate!,
      message: intl.formatMessage(
        { id: "toast.created_entity" },
        { entity: intl.formatMessage({ id: "movie" }).toLocaleLowerCase() }
      ),
    };
  };

  return (
    <FilterSelectComponent
      {...props}
      isMulti={props.isMulti ?? false}
      type="movies"
      isLoading={loading}
      items={items}
      placeholder={
        props.noSelectionString ??
        intl.formatMessage(
          { id: "actions.select_entity" },
          {
            entityType: intl.formatMessage({
              id: props.isMulti ? "movies" : "movie",
            }),
          }
        )
      }
      creatable={props.creatable ?? defaultCreatable}
      onCreate={onCreate}
    />
  );
};

export const TagSelect: React.FC<
  IFilterProps & { excludeIds?: string[]; hoverPlacement?: Placement }
> = (props) => {
  return <TagIDSelect {...props} />;
};

export const FilterSelect: React.FC<IFilterProps & ITypeProps> = (props) => {
  if (props.type === "performers") {
    return <PerformerSelect {...props} creatable={false} />;
  } else if (props.type === "studios") {
    return <StudioSelect {...props} creatable={false} />;
  } else if (props.type === "movies") {
    return <MovieSelect {...props} creatable={false} />;
  } else {
    return <TagSelect {...props} creatable={false} />;
  }
};

interface IStringListSelect {
  options?: string[];
  value: string[];
}

export const StringListSelect: React.FC<IStringListSelect> = ({
  options = [],
  value,
}) => {
  const translatedOptions = useMemo(() => {
    return options.map((o) => {
      return { label: o, value: o };
    });
  }, [options]);
  const translatedValue = useMemo(() => {
    return value.map((o) => {
      return { label: o, value: o };
    });
  }, [value]);

  const styles: StylesConfig<Option, true> = {
    option: (base) => ({
      ...base,
      color: "#000",
    }),
    container: (base, state) => ({
      ...base,
      zIndex: state.isFocused ? 10 : base.zIndex,
    }),
    multiValueRemove: (base, state) => ({
      ...base,
      color: state.isFocused ? base.color : "#333333",
    }),
  };

  return (
    <Select
      classNamePrefix="react-select"
      className="form-control react-select"
      options={translatedOptions}
      value={translatedValue}
      isMulti
      isDisabled
      styles={styles}
      components={{
        IndicatorSeparator: () => null,
        ...{ DropdownIndicator: () => null },
        ...{ MultiValueRemove: () => null },
      }}
    />
  );
};

interface IListSelect<T> {
  options?: T[];
  value: T[];
  toOptionType: (v: T) => { label: string; value: string };
  fromOptionType?: (o: { label: string; value: string }) => T;
}

export const ListSelect = <T extends {}>(props: IListSelect<T>) => {
  const { options = [], value, toOptionType } = props;

  const translatedOptions = useMemo(() => {
    return options.map(toOptionType);
  }, [options, toOptionType]);
  const translatedValue = useMemo(() => {
    return value.map(toOptionType);
  }, [value, toOptionType]);

  const styles: StylesConfig<Option, true> = {
    option: (base) => ({
      ...base,
      color: "#000",
    }),
    container: (base, state) => ({
      ...base,
      zIndex: state.isFocused ? 10 : base.zIndex,
    }),
    multiValueRemove: (base, state) => ({
      ...base,
      color: state.isFocused ? base.color : "#333333",
    }),
  };

  return (
    <Select
      classNamePrefix="react-select"
      className="form-control react-select"
      options={translatedOptions}
      value={translatedValue}
      isMulti
      isDisabled
      styles={styles}
      components={{
        IndicatorSeparator: () => null,
        ...{ DropdownIndicator: () => null },
        ...{ MultiValueRemove: () => null },
      }}
    />
  );
};

type DisableOption = Option & {
  isDisabled?: boolean;
};

interface ICheckBoxSelectProps {
  options: DisableOption[];
  selectedOptions?: DisableOption[];
  onChange: (item: OnChangeValue<DisableOption, true>) => void;
}

export const CheckBoxSelect: React.FC<ICheckBoxSelectProps> = ({
  options,
  selectedOptions,
  onChange,
}) => {
  const Option = (props: OptionProps<DisableOption, true>) => (
    <reactSelectComponents.Option {...props}>
      <input
        type="checkbox"
        disabled={props.isDisabled}
        checked={props.isSelected}
        onChange={() => null}
        className="mr-1"
      />
      <label>{props.label}</label>
    </reactSelectComponents.Option>
  );

  const DropdownIndicator = (
    props: DropdownIndicatorProps<DisableOption, true>
  ) => (
    <reactSelectComponents.DropdownIndicator {...props}>
      <Icon icon={faTableColumns} className="column-select" />
    </reactSelectComponents.DropdownIndicator>
  );

  return (
    <Select
      className="CheckBoxSelect"
      options={options}
      value={selectedOptions}
      isMulti
      closeMenuOnSelect={false}
      hideSelectedOptions={false}
      isSearchable={false}
      isClearable={false}
      components={{
        DropdownIndicator,
        Option,
        ValueContainer: () => null,
        IndicatorSeparator: () => null,
      }}
      onChange={onChange}
      styles={{
        control: (base) => ({
          ...base,
          height: "25px",
          width: "25px",
          backgroundColor: "none",
          border: "none",
          transition: "none",
          cursor: "pointer",
        }),
        dropdownIndicator: (base) => ({
          ...base,
          color: "rgb(255, 255, 255)",
          padding: "0",
        }),
        menu: (base) => ({
          ...base,
          backgroundColor: "rgb(57, 75, 89)",
        }),
        option: (base, fprops) => ({
          ...base,
          backgroundColor: fprops.isFocused
            ? "rgb(37, 49, 58)"
            : "rgb(57, 75, 89)",
          padding: "0px 12px",
        }),
        menuList: (base) => ({
          ...base,
          position: "fixed",
        }),
      }}
    />
  );
};
