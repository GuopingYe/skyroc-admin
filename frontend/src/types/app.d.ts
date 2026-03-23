/** The global namespace for the app */
declare namespace App {
  /** Theme namespace */
  namespace Theme {
    type ColorPaletteNumber = import('@sa/color').ColorPaletteNumber;

    /** Theme setting */
    interface ThemeSetting {
      /** colour weakness mode */
      colourWeakness: boolean;
      /** Fixed header and tab */
      fixedHeaderAndTab: boolean;
      /** Footer */
      footer: {
        /** Whether fixed the footer */
        fixed: boolean;
        /** Footer height */
        height: number;
        /** Whether float the footer to the right when the layout is 'horizontal-mix' */
        right: boolean;
        /** Whether to show the footer */
        visible: boolean;
      };
      /** grayscale mode */
      grayscale: boolean;
      /** Header */
      header: {
        /** Header breadcrumb */
        breadcrumb: {
          /** Whether to show the breadcrumb icon */
          showIcon: boolean;
          /** Whether to show the breadcrumb */
          visible: boolean;
        };
        /** Header height */
        height: number;
      };
      /** Whether info color is followed by the primary color */
      isInfoFollowPrimary: boolean;
      /** Whether only expand the current parent menu when the layout is 'vertical-mix' or 'horizontal-mix' */
      isOnlyExpandCurrentParentMenu: boolean;
      /** Layout */
      layout: {
        /** Layout mode */
        mode: UnionKey.ThemeLayoutMode;
        /**
         * Whether to reverse the horizontal mix
         *
         * if true, the vertical child level menus in left and horizontal first level menus in top
         */
        reverseHorizontalMix: boolean;
        /** Scroll mode */
        scrollMode: UnionKey.ThemeScrollMode;
      };
      /** Other color */
      otherColor: OtherColor;
      /** Page */
      page: {
        /** Whether to show the page transition */
        animate: boolean;
        /** Page animate mode */
        animateMode: UnionKey.ThemePageAnimateMode;
      };
      /** Whether to recommend color */
      recommendColor: boolean;
      /** Sider */
      sider: {
        /** Collapsed sider width */
        collapsedWidth: number;
        /** Inverted sider */
        inverted: boolean;
        /** Child menu width when the layout is 'vertical-mix' or 'horizontal-mix' */
        mixChildMenuWidth: number;
        /** Collapsed sider width when the layout is 'vertical-mix' or 'horizontal-mix' */
        mixCollapsedWidth: number;
        /** Sider width when the layout is 'vertical-mix' or 'horizontal-mix' */
        mixWidth: number;
        /** Sider width */
        width: number;
      };
      /** Tab */
      tab: {
        /**
         * Whether to cache the tab
         *
         * If cache, the tabs will get from the local storage when the page is refreshed
         */
        cache: boolean;
        /** Tab height */
        height: number;
        /** Tab mode */
        mode: UnionKey.ThemeTabMode;
        /** Whether to show the tab */
        visible: boolean;
      };
      /** Theme color */
      themeColor: string;
      /** Theme scheme */
      themeScheme: UnionKey.ThemeScheme;
      /** define some theme settings tokens, will transform to css variables */
      tokens: {
        dark?: {
          [K in keyof ThemeSettingToken]?: Partial<ThemeSettingToken[K]>;
        };
        light: ThemeSettingToken;
      };
      /** Watermark */
      watermark: {
        /** Watermark text */
        text: string;
        /** Whether to show the watermark */
        visible: boolean;
      };
    }

    interface OtherColor {
      error: string;
      info: string;
      success: string;
      warning: string;
    }

    interface ThemeColor extends OtherColor {
      primary: string;
    }

    type ThemeColorKey = keyof ThemeColor;

    type ThemePaletteColor = {
      [key in ThemeColorKey | `${ThemeColorKey}-${ColorPaletteNumber}`]: string;
    };

    type BaseToken = Record<string, Record<string, string>>;

    interface ThemeSettingTokenColor {
      'base-text': string;
      container: string;
      inverted: string;
      layout: string;
      /** the progress bar color, if not set, will use the primary color */
      nprogress?: string;
    }

    interface ThemeSettingTokenBoxShadow {
      header: string;
      sider: string;
      tab: string;
    }

    interface ThemeSettingToken {
      boxShadow: ThemeSettingTokenBoxShadow;
      colors: ThemeSettingTokenColor;
    }

    type ThemeTokenColor = ThemePaletteColor & ThemeSettingTokenColor;

    /** Theme token CSS variables */
    type ThemeTokenCSSVars = {
      boxShadow: ThemeSettingTokenBoxShadow & { [key: string]: string };
      colors: ThemeTokenColor & { [key: string]: string };
    };
  }

  /** Global namespace */
  namespace Global {
    type RouteKey = import('@soybean-react/vite-plugin-react-router').RouteKey;
    type RouteMap = import('@soybean-react/vite-plugin-react-router').RouteMap;
    type RoutePath = import('@soybean-react/vite-plugin-react-router').RoutePath;
    type LastLevelRouteKey = import('@soybean-react/vite-plugin-react-router').LastLevelRouteKey;

    /** The global header props */
    interface HeaderProps {
      /** Whether to show the logo */
      showLogo?: boolean;
      /** Whether to show the menu */
      showMenu?: boolean;
      /** Whether to show the menu toggler */
      showMenuToggler?: boolean;
    }

    interface IconProps {
      className?: string;
      /** Iconify icon name */
      icon?: string;
      /** Local svg icon name */
      localIcon?: string;
      style?: React.CSSProperties;
    }

    /** The global menu */
    interface Menu {
      /** The menu children */
      children?: Menu[];
      /** The menu i18n key */
      i18nKey?: I18n.I18nKey | null;
      /** The menu icon */
      icon?: React.ReactElement;
      /**
       * The menu key
       *
       * Equal to the route key
       */
      key: string;
      /** The menu label */
      label: React.ReactNode;
      /** The tooltip title */
      title?: string;
    }

    type Breadcrumb = Omit<Menu, 'children'> & {
      options?: Breadcrumb[];
    };

    /** Tab route */
    type TabRoute = Router.Route;

    /** The global tab */
    type Tab = {
      /** The tab fixed index */
      fixedIndex?: number | null;
      /** The tab route full path */
      fullPath: string;
      /** I18n key */
      i18nKey?: I18n.I18nKey | null | string;
      /**
       * Tab icon
       *
       * Iconify icon
       */
      icon?: string;
      /** The tab id */
      id: string;
      /** is keepAlive */
      keepAlive: boolean;
      /** The tab label */
      label: string;
      /**
       * Tab local icon
       *
       * Local icon
       */
      localIcon?: string;
      /**
       * The new tab label
       *
       * If set, the tab label will be replaced by this value
       */
      newLabel?: string;
      /**
       * The old tab label
       *
       * when reset the tab label, the tab label will be replaced by this value
       */
      oldLabel?: string | null;
      /** The tab route key */
      routeKey: LastLevelRouteKey;
      /** The tab route path */
      routePath: RouteMap[LastLevelRouteKey];
    };

    /** Form rule */
    type FormRule = import('antd').FormRule;

    /** The global dropdown key */
    type DropdownKey = 'closeAll' | 'closeCurrent' | 'closeLeft' | 'closeOther' | 'closeRight';
  }

  /**
   * I18n namespace
   *
   * Locales type
   */
  namespace I18n {
    type RouteKey = import('@soybean-react/vite-plugin-react-router').RouteKey;

    type LangType = 'en-US' | 'zh-CN';

    type LangOption = {
      key: LangType;
      label: string;
    };

    type I18nRouteKey = Exclude<RouteKey, 'not-found' | 'root'>;

    type FormMsg = {
      invalid: string;
      required: string;
    };

    type Schema = {
      translation: {
        common: {
          action: string;
          add: string;
          addSuccess: string;
          backToHome: string;
          batchDelete: string;
          cancel: string;
          check: string;
          close: string;
          columnSetting: string;
          config: string;
          confirm: string;
          confirmDelete: string;
          delete: string;
          deleteSuccess: string;
          edit: string;
          error: string;
          errorHint: string;
          expandColumn: string;
          index: string;
          keywordSearch: string;
          logout: string;
          logoutConfirm: string;
          lookForward: string;
          modify: string;
          modifySuccess: string;
          noData: string;
          operate: string;
          operationFailed: string;
          pleaseCheckValue: string;
          refresh: string;
          reset: string;
          search: string;
          switch: string;
          tip: string;
          trigger: string;
          tryAlign: string;
          update: string;
          updateSuccess: string;
          userCenter: string;
          warning: string;
          yesOrNo: {
            no: string;
            yes: string;
          };
        };
        datatable: {
          itemCount: string;
        };
        dropdown: Record<Global.DropdownKey, string>;
        form: {
          code: FormMsg;
          confirmPwd: FormMsg;
          email: FormMsg;
          phone: FormMsg;
          pwd: FormMsg;
          required: string;
          userName: FormMsg;
        };
        icon: {
          collapse: string;
          expand: string;
          fullscreen: string;
          fullscreenExit: string;
          lang: string;
          pin: string;
          reload: string;
          themeConfig: string;
          themeSchema: string;
          unpin: string;
        };
        page: {
          about: {
            devDep: string;
            introduction: string;
            prdDep: string;
            projectInfo: {
              githubLink: string;
              latestBuildTime: string;
              previewLink: string;
              title: string;
              version: string;
            };
            title: string;
          };
          function: {
            multiTab: {
              backTab: string;
              routeParam: string;
            };
            request: {
              repeatedError: string;
              repeatedErrorMsg1: string;
              repeatedErrorMsg2: string;
              repeatedErrorOccurOnce: string;
            };
            tab: {
              tabOperate: {
                addMultiTab: string;
                addMultiTabDesc1: string;
                addMultiTabDesc2: string;
                addTab: string;
                addTabDesc: string;
                closeAboutTab: string;
                closeCurrentTab: string;
                closeTab: string;
                title: string;
              };
              tabTitle: {
                change: string;
                changeTitle: string;
                reset: string;
                resetTitle: string;
                title: string;
              };
            };
            toggleAuth: {
              adminOrUserVisible: string;
              adminVisible: string;
              authHook: string;
              superAdminVisible: string;
              toggleAccount: string;
            };
          };
          home: {
            creativity: string;
            dealCount: string;
            downloadCount: string;
            entertainment: string;
            greeting: string;
            message: string;
            projectCount: string;
            projectNews: {
              desc1: string;
              desc2: string;
              desc3: string;
              desc4: string;
              desc5: string;
              moreNews: string;
              title: string;
            };
            registerCount: string;
            rest: string;
            schedule: string;
            study: string;
            todo: string;
            turnover: string;
            visitCount: string;
            weatherDesc: string;
            work: string;
          };
          login: {
            bindWeChat: {
              title: string;
            };
            codeLogin: {
              getCode: string;
              imageCodePlaceholder: string;
              reGetCode: string;
              sendCodeSuccess: string;
              title: string;
            };
            common: {
              back: string;
              codeLogin: string;
              codePlaceholder: string;
              confirm: string;
              confirmPasswordPlaceholder: string;
              loginOrRegister: string;
              loginSuccess: string;
              passwordPlaceholder: string;
              phonePlaceholder: string;
              userNamePlaceholder: string;
              validateSuccess: string;
              welcomeBack: string;
            };
            pwdLogin: {
              admin: string;
              forgetPassword: string;
              otherAccountLogin: string;
              otherLoginMode: string;
              register: string;
              rememberMe: string;
              superAdmin: string;
              title: string;
              user: string;
            };
            register: {
              agreement: string;
              policy: string;
              protocol: string;
              title: string;
            };
            resetPwd: {
              title: string;
            };
          };
          manage: {
            common: {
              status: {
                disable: string;
                enable: string;
              };
            };
            menu: {
              activeMenu: string;
              addChildMenu: string;
              addMenu: string;
              button: string;
              buttonCode: string;
              buttonDesc: string;
              constant: string;
              editMenu: string;
              fixedIndexInTab: string;
              form: {
                activeMenu: string;
                button: string;
                buttonCode: string;
                buttonDesc: string;
                fixedIndexInTab: string;
                fixedInTab: string;
                hideInMenu: string;
                home: string;
                href: string;
                i18nKey: string;
                icon: string;
                keepAlive: string;
                layout: string;
                localIcon: string;
                menuName: string;
                menuStatus: string;
                menuType: string;
                multiTab: string;
                order: string;
                page: string;
                parent: string;
                pathParam: string;
                queryKey: string;
                queryValue: string;
                routeName: string;
                routePath: string;
              };
              hideInMenu: string;
              home: string;
              href: string;
              i18nKey: string;
              icon: string;
              iconType: {
                iconify: string;
                local: string;
              };
              iconTypeTitle: string;
              id: string;
              keepAlive: string;
              layout: string;
              localIcon: string;
              menuName: string;
              menuStatus: string;
              menuType: string;
              multiTab: string;
              order: string;
              page: string;
              parent: string;
              parentId: string;
              pathParam: string;
              query: string;
              routeName: string;
              routePath: string;
              title: string;
              type: {
                directory: string;
                menu: string;
              };
            };
            role: {
              addRole: string;
              buttonAuth: string;
              editRole: string;
              form: {
                roleCode: string;
                roleDesc: string;
                roleName: string;
                roleStatus: string;
              };
              menuAuth: string;
              roleCode: string;
              roleDesc: string;
              roleName: string;
              roleStatus: string;
              title: string;
            };
            roleDetail: {
              content: string;
              explain: string;
            };
            user: {
              addUser: string;
              editUser: string;
              form: {
                nickName: string;
                userEmail: string;
                userGender: string;
                userName: string;
                userPhone: string;
                userRole: string;
                userStatus: string;
              };
              gender: {
                female: string;
                male: string;
              };
              nickName: string;
              title: string;
              userEmail: string;
              userGender: string;
              userName: string;
              userPhone: string;
              userRole: string;
              userStatus: string;
            };
            userDetail: {
              content: string;
              explain: string;
            };
          };
          mdr: {
            contextSelector: {
              contextReady: string;
              label: string;
              selectAnalysis: string;
              selectAnalysisHint: string;
              selectProduct: string;
              selectRequired: string;
              selectStudy: string;
              selectStudyHint: string;
            };
            globalLibrary: {
              baseClassName: string;
              biomedicalConcept: string;
              biomedicalConceptMapping: string;
              browse: string;
              code: string;
              collectionFields: string;
              // 动态列 Schema
              cols: {
                biomedicalConcept: string;
                class: string;
                core: string;
                crfPrompt: string;
                dataType: string;
                definition: string;
                derivation: string;
                description: string;
                domain: string;
                fieldName: string;
                itemId: string;
                label: string;
                length: string;
                name: string;
                nciCode: string;
                observationClass: string;
                origin: string;
                question: string;
                required: string;
                responseOptions: string;
                role: string;
                sdtmDomain: string;
                sdtmMapping: string;
                sdtmVariable: string;
                synonyms: string;
                term: string;
                type: string;
                variable: string;
                variableName: string;
                varName: string;
              };
              conceptId: string;
              connectionError: string;
              core: string;
              coreFilter: string;
              crfPrompt: string;
              datasets: string;
              dataSource: string;
              dataType: string;
              definition: string;
              derivation: string;
              fieldName: string;
              itemId: string;
              label: string;
              length: string;
              loadError: string;
              loading: string;
              modelTraceability: string;
              moreItems: string;
              nciCode: string;
              noData: string;
              noDatasets: string;
              noSearchResults: string;
              notFound: string;
              origin: string;
              question: string;
              questionItems: string;
              refresh: string;
              required: string;
              responseOptions: string;
              role: string;
              sdtmDomain: string;
              sdtmMapping: string;
              sdtmVariable: string;
              searchDataset: string;
              searchDomain: string;
              searchPlaceholder: string;
              searchStandard: string;
              selectSubType: string;
              selectVersion: string;
              selectVersionHint: string;
              selectVersionPrompt: string;
              standardTree: string;
              subTypes: {
                adamCt: string;
                adamIg: string;
                adamModel: string;
                cdashCt: string;
                cdashIg: string;
                qrsIg: string;
                sdtmCt: string;
                sdtmIg: string;
                sdtmModel: string;
              };
              syncCDISC: string;
              synonyms: string;
              term: string;
              termList: string;
              title: string;
              total: string;
              totalVariables: string;
              traceabilityDesc: string;
              traceabilityTip: string;
              type: string;
              variableList: string;
              // 保留原有字段以兼容
              variableName: string;
              variables: string;
              viewVariables: string;
            };
            mapping: {
              addMapping: string;
              aiComingSoon: string;
              analysis: string;
              cancel: string;
              changeContext: string;
              changeContextHint: string;
              clickToStart: string;
              compound: string;
              delete: string;
              derivation: string;
              derivationLogic: string;
              editing: string;
              enterLogic: string;
              enterVariable: string;
              filterAll: string;
              filterByForm: string;
              filterDraft: string;
              filterInProduction: string;
              filterMapped: string;
              filterQCing: string;
              filterUnmapped: string;
              generateCode: string;
              import: string;
              importSDR: string;
              importSDRDesc: string;
              importSDRError: string;
              importSDRHint: string;
              importSDRParsing: string;
              importSDRSuccess: string;
              importSDRTitle: string;
              logicExample: string;
              mappedCount: string;
              mappingCard: string;
              mappingCount: string;
              naturalLanguage: string;
              nlPlaceholder: string;
              noFieldsFound: string;
              noMapping: string;
              oneToNHint: string;
              programmer: string;
              rCode: string;
              rPlaceholder: string;
              sasCode: string;
              sasPlaceholder: string;
              sasSyntax: string;
              save: string;
              saveSuccess: string;
              scopeContext: string;
              searchPlaceholder: string;
              selectDomain: string;
              selectFieldPrompt: string;
              showCount: string;
              sourceFields: string;
              sourceForm: string;
              status: {
                Draft: string;
                In_Production: string;
                Locked: string;
                QCing: string;
              };
              study: string;
              submitQC: string;
              submittedToQC: string;
              subtitle: string;
              supportOneToN: string;
              ta: string;
              targetDomain: string;
              targetVariable: string;
              title: string;
              upload: string;
            };
            pipelineManagement: {
              analysisConfig: {
                archivedHint: string;
                description: string;
                goToMapping: string;
                lockedAt: string;
                lockedBy: string;
                title: string;
              };
              archive: string;
              archiveConfirm: string;
              archiveSuccess: string;
              cancelEdit: string;
              children: {
                title: string;
              };
              cols: {
                action: string;
                createdAt: string;
                id: string;
                nodeType: string;
                status: string;
                title: string;
                updatedAt: string;
              };
              context: {
                scope: string;
                selectAnalysisForJobs: string;
                selectAnalysisHint: string;
                selectHint: string;
                selectRequired: string;
                selectStudyForConfig: string;
                selectStudyForTimeline: string;
                selectStudyHint: string;
              };
              createChild: string;
              createModal: {
                duplicateNameError: string;
                title: string;
                titlePlaceholder: string;
              };
              createSuccess: string;
              createTA: string;
              edit: string;
              jobs: {
                cols: {
                  duration: string;
                  name: string;
                  startTime: string;
                  status: string;
                  triggeredBy: string;
                  type: string;
                };
                status: {
                  Cancelled: string;
                  Failed: string;
                  Running: string;
                  Success: string;
                };
                title: string;
              };
              lifecycleStatus: string;
              lockedWarning: string;
              milestone: {
                add: string;
                cols: {
                  action: string;
                  actualDate: string;
                  assignee: string;
                  comment: string;
                  level: string;
                  name: string;
                  plannedDate: string;
                  presetType: string;
                  status: string;
                };
                createModal: {
                  title: string;
                };
                delete: string;
                deleteConfirm: string;
                edit: string;
                editModal: {
                  title: string;
                };
                noMilestones: string;
                showingAnalysisLevel: string;
                showingStudyLevel: string;
                stats: {
                  atRisk: string;
                  completed: string;
                  delayed: string;
                  onTrack: string;
                  pending: string;
                  total: string;
                };
                status: {
                  AtRisk: string;
                  Completed: string;
                  Delayed: string;
                  OnTrack: string;
                  Pending: string;
                };
                tableTitle: string;
                timelineTitle: string;
                totalCount: string;
              };
              save: string;
              saveFailed: string;
              saveSuccess: string;
              selectNodeHint: string;
              studyConfig: {
                basicInfo: string;
                cdiscStandards: string;
                dictionaries: string;
                loadVersionsFailed: string;
                phase: string;
                protocolTitle: string;
                title: string;
              };
              tabs: {
                jobs: string;
                portfolio: string;
                studyConfig: string;
                timelines: string;
              };
              tree: {
                collapseAll: string;
                expandAll: string;
                title: string;
              };
              view: string;
            };
            programmingTracker: {
              addTask: string;
              category: {
                adam: string;
                other: string;
                sdtm: string;
                tfl: string;
              };
              cols: {
                action: string;
                analysisPopulation: string;
                dataset: string;
                datasetLabel: string;
                description: string;
                domain: string;
                label: string;
                outputId: string;
                population: string;
                primaryProgrammer: string;
                programmers: string;
                qcProgrammer: string;
                qcStatus: string;
                sdrSource: string;
                status: string;
                taskCategory: string;
                taskName: string;
                title: string;
                type: string;
              };
              context: {
                contextReady: string;
                selectAnalysis: string;
                selectHint: string;
                selectionLabel: string;
                selectProduct: string;
                selectRequired: string;
                selectStudy: string;
              };
              createModal: {
                success: string;
                title: string;
              };
              delete: string;
              deleteConfirm: string;
              deleteSuccess: string;
              edit: string;
              editModal: {
                success: string;
                title: string;
              };
              form: {
                customDatasetName: string;
                customDomainName: string;
                customizedDataset: string;
                customizedDomain: string;
                datasetLabelPlaceholder: string;
                datasetPlaceholder: string;
                descriptionPlaceholder: string;
                domainPlaceholder: string;
                labelPlaceholder: string;
                outputIdPlaceholder: string;
                populationPlaceholder: string;
                primaryProgrammerPlaceholder: string;
                qcProgrammerPlaceholder: string;
                sdrSourcePlaceholder: string;
                statusPlaceholder: string;
                taskCategoryPlaceholder: string;
                taskNamePlaceholder: string;
                titlePlaceholder: string;
                typePlaceholder: string;
                validateMsg: {
                  customDatasetRequired: string;
                  customDomainRequired: string;
                  datasetLabelRequired: string;
                  datasetNameFormat: string;
                  datasetRequired: string;
                  descriptionRequired: string;
                  domainNameFormat: string;
                  domainRequired: string;
                  labelRequired: string;
                  outputIdRequired: string;
                  populationRequired: string;
                  primaryProgrammerRequired: string;
                  qcProgrammerRequired: string;
                  sdrSourceRequired: string;
                  statusRequired: string;
                  taskCategoryRequired: string;
                  taskNameRequired: string;
                  titleRequired: string;
                  typeRequired: string;
                };
              };
              popconfirm: {
                cancel: string;
                confirm: string;
              };
              recent: {
                clear: string;
                daysAgo: string;
                hoursAgo: string;
                justNow: string;
                minutesAgo: string;
                title: string;
              };
              stats: {
                completed: string;
                inProgress: string;
                inQC: string;
                notStarted: string;
                openIssues: string;
                signedOff: string;
                total: string;
              };
              title: string;
              totalTasks: string;
            };
            studySpec: {
              addDataset: {
                add: string;
                autoReplaceHint: string;
                classType: string;
                classTypeRequired: string;
                customDomain: string;
                domainLabel: string;
                domainLabelRequired: string;
                domainName: string;
                domainNameFormat: string;
                domainNameRequired: string;
                enterDomainName: string;
                fromGlobalLibrary: string;
                searchDataset: string;
                selectDataset: string;
                selectDatasetHint: string;
                success: string;
                title: string;
                variablePreview: string;
              };
              addSuccess: string;
              addVariable: string;
              class: string;
              cols: {
                action: string;
                codelist: string;
                comment: string;
                core: string;
                dataType: string;
                implementationNotes: string;
                label: string;
                length: string;
                origin: string;
                role: string;
                sourceDerivation: string;
                sourceField: string;
                variableName: string;
              };
              confirmDelete: string;
              datasets: string;
              delete: string;
              deleteSuccess: string;
              edit: string;
              editDrawer: {
                aiPrompt: string;
                cancel: string;
                commentPlaceholder: string;
                derivationPlaceholder: string;
                implementationNotesPlaceholder: string;
                save: string;
                saveSuccess: string;
                sourceField: string;
                sourceFieldPlaceholder: string;
                title: string;
              };
              form: {
                validateMsg: {
                  coreRequired: string;
                  dataTypeRequired: string;
                  labelRequired: string;
                  lengthRequired: string;
                  roleRequired: string;
                  variableNameRequired: string;
                };
              };
              keys: string;
              noDatasets: string;
              scopeContext: {
                analysis: string;
                compound: string;
                currentScope: string;
                selectHint: string;
                study: string;
                switchAnalysis: string;
                ta: string;
              };
              searchDataset: string;
              sortSuccess: string;
              structure: string;
              title: string;
              totalRows: string;
              totalVars: string;
              traceDrawer: {
                hint: string;
                title: string;
              };
              traceGlobalLibrary: string;
              variables: string;
            };
            tflDesigner: {
              actions: {
                confirmDelete: string;
                delete: string;
                duplicate: string;
                fromTemplate: string;
                newFigure: string;
                newListing: string;
                newTable: string;
              };
              canvas: {
                addColumn: string;
                addFootnote: string;
                addRow: string;
                addTitle: string;
                dragHint: string;
                emptyHint: string;
                parameter: string;
              };
              context: {
                selectAnalysisForTfl: string;
                selectAnalysisHint: string;
              };
              figureHints: {
                addSeries: string;
                configureXAxis: string;
                configureYAxis: string;
                selectChartType: string;
                unsupportedType: string;
              };
              figureMeta: {
                basicInfo: string;
                chartType: string;
              };
              leftPanel: {
                datasets: string;
                searchStatistics: string;
                searchVariables: string;
                statisticHint: string;
                statistics: string;
              };
              listingMeta: {
                analysisFilter: string;
                analysisSubset: string;
                basicInfo: string;
                columnHeaderSet: string;
                selectHeaderSet: string;
                selectHeaderSetPlaceholder: string;
                whereClause: string;
              };
              messages: {
                exported: string;
                newShellCreated: string;
                saved: string;
                statisticAdded: string;
                variableAdded: string;
              };
              overview: {
                emptyHint: string;
                selectOrCreate: string;
              };
              props: {
                alignment: string;
                columnCode: string;
                columnColor: string;
                columnName: string;
                deleteColumn: string;
                deleteFootnote: string;
                deleteRow: string;
                deleteTitle: string;
                footnoteText: string;
                indentLevel: string;
                label: string;
                name: string;
                rowType: string;
                status: string;
                tflId: string;
                titleText: string;
                type: string;
              };
              rightPanel: {
                cell: string;
                column: string;
                footnote: string;
                row: string;
                selectHint: string;
                shell: string;
                title: string;
              };
              sidebar: {
                all: string;
                empty: string;
                figures: string;
                listings: string;
                studySettings: string;
                studySettingsBack: string;
                tables: string;
              };
              tableMeta: {
                analysisFilter: string;
                analysisSubset: string;
                basicInfo: string;
                columnHeaderSet: string;
                headerLayers: string;
                selectArmSet: string;
                selectArmSetPlaceholder: string;
                selectHeaderSet: string;
                selectHeaderSetPlaceholder: string;
                treatmentArms: string;
                whereClause: string;
              };
              tabs: {
                axes: string;
                columns: string;
                filter: string;
                footer: string;
                metadata: string;
                population: string;
                preview: string;
                programmingNotes: string;
                rowStructure: string;
                series: string;
                sortOrder: string;
                statistics: string;
                treatmentArms: string;
              };
              toolbar: {
                editMode: string;
                export: string;
                newShell: string;
                previewMode: string;
                redo: string;
                save: string;
                undo: string;
                zoomIn: string;
                zoomOut: string;
              };
            };
            tflTemplateLibrary: Record<string, string>;
          };
        };
        request: {
          logout: string;
          logoutMsg: string;
          logoutWithModal: string;
          logoutWithModalMsg: string;
          refreshToken: string;
          tokenExpired: string;
        };
        route: Record<I18nRouteKey, string> & {
          notFound: string;
          root: string;
        };
        system: {
          errorReason: string;
          pipelineManagement: {
            lifecycleStatus: string;
            lockedWarning: string;
          };
          reload: string;
          tflDesigner: {
            categories: Record<string, string>;
            common: Record<string, string>;
            displayTypes: Record<string, string>;
            exportFormats: Record<string, any>;
            figure: Record<string, any>;
            headerStyles: Record<string, any>;
            listing: Record<string, any>;
            populations: Record<string, string>;
            studyMetadata: Record<string, string>;
            table: Record<string, any>;
            title: string;
            [key: string]: any;
          };
          tflTemplateLibrary: Record<string, string>;
          title: string;
          updateCancel: string;
          updateConfirm: string;
          updateContent: string;
          updateTitle: string;
          userManagement: {
            addUser: string;
            assignPermission: string;
            cols: {
              action: string;
              department: string;
              lastLogin: string;
              permissions: string;
              status: string;
              user: string;
            };
            delete: string;
            deleteConfirm: string;
            deleteSuccess: string;
            edit: string;
            editModal: {
              cancel: string;
              department: string;
              displayName: string;
              displayNameRequired: string;
              email: string;
              emailInvalid: string;
              emailRequired: string;
              save: string;
              saveSuccess: string;
              status: string;
              title: string;
            };
            filters: {
              allStatus: string;
            };
            noPermissions: string;
            permission: {
              assign: string;
              assignSuccess: string;
              cancel: string;
              currentPermissions: string;
              hint: string;
              rolePlaceholder: string;
              selectNode: string;
              selectRequired: string;
              selectRole: string;
              title: string;
            };
            // Permission categories
            permissionCategories: {
              admin: string;
              metadata: string;
              project: string;
              qc: string;
            };
            // Permission labels and descriptions
            permissions: {
              archive_node: { description: string; label: string };
              assign_roles: { description: string; label: string };
              close_issue: { description: string; label: string };
              create_study: { description: string; label: string };
              create_ta: { description: string; label: string };
              delete_study: { description: string; label: string };
              delete_ta: { description: string; label: string };
              edit_mapping: { description: string; label: string };
              edit_spec: { description: string; label: string };
              export_mapping: { description: string; label: string };
              import_sdr: { description: string; label: string };
              lock_study: { description: string; label: string };
              manage_users: { description: string; label: string };
              open_issue: { description: string; label: string };
              respond_issue: { description: string; label: string };
              sign_off: { description: string; label: string };
              view_audit_log: { description: string; label: string };
            };
            rolePermission: {
              permissionMatrix: string;
              roleList: string;
              save: string;
              saveSuccess: string;
              selectRoleHint: string;
              superAdminOnly: string;
              systemRole: string;
              title: string;
            };
            // Role labels and descriptions
            roles: {
              Admin: { description: string; label: string };
              Programmer: { description: string; label: string };
              QCReviewer: { description: string; label: string };
              StudyLead: { description: string; label: string };
              SuperAdmin: { description: string; label: string };
              Viewer: { description: string; label: string };
            };
            // Scope node types
            scopeNodes: {
              Analysis: string;
              Compound: string;
              Study: string;
              TA: string;
            };
            searchPlaceholder: string;
            stats: {
              active: string;
              inactive: string;
              locked: string;
              total: string;
            };
            // User status labels
            status: {
              Active: string;
              Inactive: string;
              Locked: string;
            };
            title: string;
          };
        };
        theme: {
          colourWeakness: string;
          configOperation: {
            copyConfig: string;
            copyFailedMsg: string;
            copySuccessMsg: string;
            resetConfig: string;
            resetSuccessMsg: string;
          };
          fixedHeaderAndTab: string;
          footer: {
            fixed: string;
            height: string;
            right: string;
            visible: string;
          };
          grayscale: string;
          header: {
            breadcrumb: {
              showIcon: string;
              visible: string;
            };
            height: string;
          };
          isOnlyExpandCurrentParentMenu: string;
          layoutMode: { reverseHorizontalMix: string; title: string } & Record<UnionKey.ThemeLayoutMode, string>;
          page: {
            animate: string;
            mode: { title: string } & Record<UnionKey.ThemePageAnimateMode, string>;
          };
          pageFunTitle: string;
          recommendColor: string;
          recommendColorDesc: string;
          scrollMode: { title: string } & Record<UnionKey.ThemeScrollMode, string>;
          sider: {
            collapsedWidth: string;
            inverted: string;
            mixChildMenuWidth: string;
            mixCollapsedWidth: string;
            mixWidth: string;
            width: string;
          };
          tab: {
            cache: string;
            height: string;
            mode: { title: string } & Record<UnionKey.ThemeTabMode, string>;
            visible: string;
          };
          themeColor: {
            followPrimary: string;
            title: string;
          } & Theme.ThemeColor;
          themeDrawerTitle: string;
          themeSchema: { title: string };
          watermark: {
            text: string;
            visible: string;
          };
        };
      };
    };

    type GetI18nKey<T extends Record<string, unknown>, K extends keyof T = keyof T> = K extends string
      ? T[K] extends Record<string, unknown>
        ? `${K}.${GetI18nKey<T[K]>}`
        : K
      : never;

    // Use string to avoid TS2589 "Type instantiation is excessively deep" error
    // The GetI18nKey type is kept for documentation but not used directly
    type I18nKey = string;

    type TranslateOptions<Locales extends string> = import('react-i18next').TranslationProps<Locales>;

    interface $T {
      (key: I18nKey): string;
      (key: I18nKey, plural: number, options?: TranslateOptions<LangType>): string;
      (key: I18nKey, defaultMsg: string, options?: TranslateOptions<I18nKey>): string;
      (key: I18nKey, list: unknown[], options?: TranslateOptions<I18nKey>): string;
      (key: I18nKey, list: unknown[], plural: number): string;
      (key: I18nKey, list: unknown[], defaultMsg: string): string;
      (key: I18nKey, named: Record<string, unknown>, options?: TranslateOptions<LangType>): string;
      (key: I18nKey, named: Record<string, unknown>, plural: number): string;
      (key: I18nKey, named: Record<string, unknown>, defaultMsg: string): string;
    }
  }

  /** Service namespace */
  namespace Service {
    /** Other baseURL key */
    type OtherBaseURLKey = 'demo';

    interface ServiceConfigItem {
      /** The backend service base url */
      baseURL: string;
      /** The proxy pattern of the backend service base url */
      proxyPattern: string;
    }

    interface OtherServiceConfigItem extends ServiceConfigItem {
      key: OtherBaseURLKey;
    }

    /** The backend service config */
    interface ServiceConfig extends ServiceConfigItem {
      /** Other backend service config */
      other: OtherServiceConfigItem[];
    }

    interface SimpleServiceConfig extends Pick<ServiceConfigItem, 'baseURL'> {
      other: Record<OtherBaseURLKey, string>;
    }

    /** The backend service response data */
    type Response<T = unknown> = {
      /** The backend service response code */
      code: string;
      /** The backend service response data */
      data: T;
      /** The backend service response message */
      msg: string;
    };

    /** The demo backend service response data */
    type DemoResponse<T = unknown> = {
      /** The backend service response message */
      message: string;
      /** The backend service response data */
      result: T;
      /** The backend service response code */
      status: string;
    };
  }
}
