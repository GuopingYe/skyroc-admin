/** MDR module type definitions */

declare namespace Api.MDR {
  // Programming Tracker types
  type TaskCategory = 'ADaM' | 'Other' | 'SDTM' | 'TFL';
  type TFLOutputType = 'Figure' | 'Listing' | 'Table';
  type TaskStatus = 'In Progress' | 'Not Started' | 'QC Pass' | 'Ready for QC' | 'Signed Off';
  type IssueCategory = 'Comment' | 'Data' | 'Format' | 'Logic' | 'Validation';
  type IssueStatus = 'Closed' | 'Open' | 'Responded';
  type QCRoundStatus = 'Closed' | 'Open';

  interface Person {
    avatar?: string;
    email: string;
    id: string;
    name: string;
  }

  interface QCIssue {
    category: IssueCategory;
    description: string;
    founder: Person;
    foundTime: string;
    id: string;
    responder?: Person;
    response?: string;
    responseTime?: string;
    status: IssueStatus;
  }

  interface QCRound {
    closedAt?: string;
    issues: QCIssue[];
    roundNumber: number;
    startedAt: string;
    status: QCRoundStatus;
  }

  interface BaseTask {
    createdAt: string;
    id: string;
    primaryProgrammer: Person;
    qcProgrammer: Person;
    qcRounds: QCRound[];
    status: TaskStatus;
    updatedAt: string;
  }

  interface SDTMTask extends BaseTask {
    category: 'SDTM';
    datasetLabel: string;
    domain: string;
    sdrSource: string;
  }

  interface ADaMTask extends BaseTask {
    analysisPopulation: string;
    category: 'ADaM';
    dataset: string;
    label: string;
  }

  interface TFLTask extends BaseTask {
    category: 'TFL';
    outputId: string;
    population: string;
    sourceDatasets?: string[];
    title: string;
    type: TFLOutputType;
  }

  interface OtherTask extends BaseTask {
    category: 'Other';
    description: string;
    taskCategory: string;
    taskName: string;
  }

  type TrackerTask = ADaMTask | OtherTask | SDTMTask | TFLTask;

  // Task creation/update params
  interface TFLTaskParams {
    outputId: string;
    population: string;
    primaryProgrammer: string;
    qcProgrammer: string;
    status: TaskStatus;
    title: string;
    type: TFLOutputType;
  }

  interface SDTMTaskParams {
    datasetLabel: string;
    domain: string;
    primaryProgrammer: string;
    qcProgrammer: string;
    sdrSource: string;
    status: TaskStatus;
  }

  interface ADaMTaskParams {
    analysisPopulation: string;
    dataset: string;
    label: string;
    primaryProgrammer: string;
    qcProgrammer: string;
    status: TaskStatus;
  }

  interface OtherTaskParams {
    description: string;
    primaryProgrammer: string;
    qcProgrammer: string;
    status: TaskStatus;
    taskCategory: string;
    taskName: string;
  }

  type TrackerTaskCreateParams = {
    analysisId: string;
    category: TaskCategory;
  } & (ADaMTaskParams | OtherTaskParams | SDTMTaskParams | TFLTaskParams);

  type TrackerTaskUpdateParams = {
    id: string;
  } & Partial<ADaMTaskParams | OtherTaskParams | SDTMTaskParams | TFLTaskParams>;

  // Study Spec types
  type StandardType = 'ADaM' | 'SDTM';
  type VariableOrigin = 'Assigned' | 'CRF' | 'Derived' | 'Protocol';

  interface SpecVariable {
    codelist?: string;
    comment?: string;
    core: 'Exp' | 'Perm' | 'Req';
    dataType: 'Char' | 'Date' | 'DateTime' | 'Num';
    format?: string;
    globalLibraryRef?: string;
    implementationNotes?: string;
    key: string;
    label: string;
    length: number;
    mappedSourceField?: string;
    name: string;
    order: number;
    origin: VariableOrigin;
    role: string;
    sourceDerivation?: string;
  }

  interface SpecDataset {
    class: string;
    key: string;
    keys: string[];
    label: string;
    name: string;
    purpose: string;
    structure: string;
  }

  interface SpecVariableCreateParams {
    codelist?: string;
    comment?: string;
    core: 'Exp' | 'Perm' | 'Req';
    datasetKey: string;
    dataType: 'Char' | 'Date' | 'DateTime' | 'Num';
    implementationNotes?: string;
    label: string;
    length: number;
    name: string;
    origin: VariableOrigin;
    role: string;
    sourceDerivation?: string;
    standard: StandardType;
  }

  interface SpecVariableUpdateParams {
    comment?: string;
    id: string;
    implementationNotes?: string;
    mappedSourceField?: string;
    origin?: VariableOrigin;
    sourceDerivation?: string;
  }
}
